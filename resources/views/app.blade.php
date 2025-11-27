<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        <title>TaskFlow - Project Task Management</title>
        <meta name="description" content="Modern task management tool for teams. Organize, track, and manage project tasks with kanban boards, filters, and team collaboration features." />

        @viteReactRefresh
        @vite(['resources/js/project-aura-new/src/index.css', 'resources/js/project-aura-new/src/main.tsx'])
    </head>
    <body>
        <div id="root"></div>
    </body>
</html>
