import React, { useState, useEffect } from 'react';

interface Task {
  _id: string;
  title: string;
  description: string;
  completed: boolean;
}

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/tasks');
      const data = await response.json();
      setTasks(data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch tasks');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTask),
      });
      const data = await response.json();
      setTasks([...tasks, data]);
      setNewTask({ title: '', description: '' });
    } catch (err) {
      setError('Failed to create task');
    }
  };

  const toggleComplete = async (taskId: string) => {
    try {
      const task = tasks.find(t => t._id === taskId);
      if (!task) return;

      const response = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: !task.completed }),
      });
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t._id === taskId ? updatedTask : t));
    } catch (err) {
      setError('Failed to update task');
    }
  };

  const handleEdit = async (taskId: string) => {
    if (!editingTask) return;
    try {
      const response = await fetch(`http://localhost:8000/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingTask.title,
          description: editingTask.description,
        }),
      });
      const updatedTask = await response.json();
      setTasks(tasks.map(t => t._id === taskId ? updatedTask : t));
      setEditingTask(null);
    } catch (err) {
      setError('Failed to update task');
    }
  };

  if (loading) return <div>Loading tasks...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Task title"
            value={newTask.title}
            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <textarea
            placeholder="Task description"
            value={newTask.description}
            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded">
          Add Task
        </button>
      </form>

      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task._id} className="border p-4 rounded">
            {editingTask?._id === task._id ? (
              <div>
                <input
                  type="text"
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full p-2 mb-2 border rounded"
                />
                <textarea
                  value={editingTask.description}
                  onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full p-2 mb-2 border rounded"
                />
                <button
                  onClick={() => handleEdit(task._id)}
                  className="bg-green-500 text-white px-4 py-2 rounded mr-2"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingTask(null)}
                  className="bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{task.title}</h3>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleComplete(task._id)}
                    className="h-5 w-5"
                  />
                </div>
                <p className="mt-2 text-gray-600">{task.description}</p>
                <button
                  onClick={() => setEditingTask(task)}
                  className="mt-2 bg-yellow-500 text-white px-4 py-2 rounded"
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskList;
