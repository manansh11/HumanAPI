import React from 'react';
import TaskList from './components/TaskList';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Task Management System</h1>
        <TaskList />
      </div>
    </div>
  );
}

export default App;
