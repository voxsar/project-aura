<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientContact;
use App\Models\ClientHistory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use OpenApi\Attributes as OA;

class ClientController extends Controller
{
    /**
     * Check if the user has permission to manage clients.
     */
    protected function checkPermission()
    {
        abort_if(!in_array(auth()->user()->role, ['admin', 'hr']), 403, 'Unauthorized. Only Admin and HR can manage clients.');
    }

    /**
     * Record an action in the client history.
     */
    protected function recordHistory($clientId, $action, $targetName, $details = null)
    {
        ClientHistory::create([
            'user_id' => auth()->id(),
            'client_id' => $clientId,
            'action' => $action,
            'target_name' => $targetName,
            'details' => $details,
        ]);
    }

    #[OA\Get(
        path: "/clients",
        summary: "List all clients",
        tags: ["Clients"],
        parameters: [
            new OA\Parameter(name: "search", in: "query", required: false, schema: new OA\Schema(type: "string"))
        ],
        responses: [
            new OA\Response(response: 200, description: "List of clients")
        ]
    )]
    public function index(Request $request)
    {
        $this->checkPermission();

        $query = Client::withCount(['contacts', 'projects'])
            ->with(['projects' => function ($query) {
                $query->with(['department', 'group']); // Include department and group
            }]);

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('company_name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderBy('company_name')->get());
    }

    public function store(Request $request)
    {
        $this->checkPermission();

        $validated = $request->validate([
            'company_name' => 'required|string|max:255|unique:clients,company_name',
            'industry' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $validated['created_by'] = auth()->id();

        $client = Client::create($validated);

        $this->recordHistory($client->id, 'created_client', $client->company_name);

        return response()->json($client, 201);
    }

    public function show(Client $client): JsonResponse
    {
        $this->checkPermission();
        return response()->json($client->load(['contacts', 'projects' => function ($query) {
            $query->with(['department', 'group']);
        }]));
    }

    public function update(Request $request, Client $client)
    {
        $this->checkPermission();

        $validated = $request->validate([
            'company_name' => 'required|string|max:255|unique:clients,company_name,' . $client->id,
            'industry' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $client->update($validated);

        $this->recordHistory($client->id, 'updated_client', $client->company_name);

        return response()->json($client);
    }

    public function destroy(Client $client)
    {
        $this->checkPermission();
        
        $companyName = $client->company_name;
        $clientId = $client->id;
        
        $client->delete();

        $this->recordHistory($clientId, 'deleted_client', $companyName);

        return response()->noContent();
    }

    /**
     * Store a new contact for the client.
     */
    public function storeContact(Request $request, Client $client)
    {
        $this->checkPermission();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'is_primary' => 'boolean',
        ]);

        if ($request->is_primary) {
            $client->contacts()->update(['is_primary' => false]);
        }

        $contact = $client->contacts()->create($validated);

        $this->recordHistory($client->id, 'added_contact', $contact->name, ['company' => $client->company_name]);

        return response()->json($contact, 201);
    }

    /**
     * Update a contact.
     */
    public function updateContact(Request $request, Client $client, ClientContact $contact)
    {
        $this->checkPermission();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:255',
            'is_primary' => 'boolean',
        ]);

        if ($request->is_primary) {
            $client->contacts()->where('id', '!=', $contact->id)->update(['is_primary' => false]);
        }

        $contact->update($validated);

        $this->recordHistory($client->id, 'updated_contact', $contact->name, ['company' => $client->company_name]);

        return response()->json($contact);
    }

    /**
     * Remove a contact.
     */
    public function destroyContact(Client $client, ClientContact $contact)
    {
        $this->checkPermission();

        if ($contact->client_id !== $client->id) {
            return response()->json(['message' => 'Contact does not belong to this client.'], 404);
        }

        $contactName = $contact->name;
        $contact->delete();

        $this->recordHistory($client->id, 'deleted_contact', $contactName, ['company' => $client->company_name]);

        return response()->noContent();
    }

    /**
     * Merge another client into this client.
     *
     * All estimates, projects, and contacts belonging to the source client are
     * re-assigned to $client (the target), source history entries are moved,
     * a merged_client history entry is recorded, and the source client is deleted.
     *
     * POST /clients/{client}/merge   Body: { "merge_client_id": <int> }
     */
    public function mergeClients(Request $request, Client $client)
    {
        $this->checkPermission();

        $validated = $request->validate([
            'merge_client_id' => 'required|integer|exists:clients,id',
        ]);

        $sourceId = (int) $validated['merge_client_id'];

        if ($sourceId === $client->id) {
            return response()->json(['message' => 'Cannot merge a client with itself.'], 422);
        }

        $source = Client::findOrFail($sourceId);

        DB::transaction(function () use ($client, $source) {
            // Re-assign all related records from source → target
            \App\Models\Estimate::where('client_id', $source->id)->update(['client_id' => $client->id]);
            \App\Models\Project::where('client_id', $source->id)->update(['client_id' => $client->id]);
            ClientContact::where('client_id', $source->id)->update(['client_id' => $client->id]);
            ClientHistory::where('client_id', $source->id)->update(['client_id' => $client->id]);

            // Carry over xero_contact_id if the target doesn't have one yet
            if (!$client->xero_contact_id && $source->xero_contact_id) {
                $client->update(['xero_contact_id' => $source->xero_contact_id]);
            }

            // Record merge in target's history
            $this->recordHistory($client->id, 'merged_client', $client->company_name, [
                'merged_client_id'   => $source->id,
                'merged_client_name' => $source->company_name,
            ]);

            // Delete the source client
            $source->delete();
        });

        return response()->json($client->fresh()->load(['contacts', 'projects']));
    }
}

