<?php

namespace App\Console\Commands;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\DB;
use ZipArchive;
use Illuminate\Support\Facades\Storage;
use Illuminate\Console\Command;

class RestoreBackup extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'backup:restore';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        //
		$this->info('Restoring backup...');

		//backup files are located in storage/app/<APP_NAME>/ show all files in that directory and let user choose one reverse the array so the latest backup is at the top
		$files = Storage::files(env('APP_NAME'));
		$files = array_filter($files, function ($file) {
			return strpos($file, '.zip') !== false;
		});

		if (empty($files)) {
			$this->error('No backup files found.');
			return;
		}

		$files = array_values($files); // reindex array
		//show the files to the user and let them choose one

		$this->info('Available backup files:');
		foreach ($files as $file) {
			$this->line(" - $file");
		}

		$choice = $this->choice('Select a backup file to restore', $files);
		$this->info("You selected: $choice");

		//unzip the file to the storage path
		$zip = new ZipArchive;
		$res = $zip->open(storage_path('app/' . $choice));
		if ($res === TRUE) {
			$zip->extractTo(storage_path('app/'));
			$zip->close();
		} else {
			$this->error('Failed to open the zip file.');
			return;
		}

		//read the database.sql file and execute the queries
		$sqlFile = storage_path('app/db-dumps/mysql-scanner_db.sql');
		if (!File::exists($sqlFile)) {
			$this->error('database.sql file not found in the backup.');
			return;
		}

		//there is an extra folder called var inside app/ delete it if it exists
		if (File::exists(storage_path('app/var'))) {
			File::deleteDirectory(storage_path('app/var'));
		}

		$sql = File::get($sqlFile);
		DB::unprepared($sql);
		//delete the extracted files
		File::deleteDirectory(storage_path('app/db-dumps'));

		$this->info('Backup restored successfully.');
    }
}
