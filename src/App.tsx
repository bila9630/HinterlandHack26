import { FormEvent, useMemo, useState } from "react";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

type Filter = "all" | "active" | "completed";

const initialTodos: Todo[] = [
  { id: 1, title: "Plan the day", completed: true },
  { id: 2, title: "Finish the project", completed: false },
];

export default function App() {
  const [todos, setTodos] = useState(initialTodos);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filteredTodos = useMemo(() => {
    if (filter === "active") return todos.filter((todo) => !todo.completed);
    if (filter === "completed") return todos.filter((todo) => todo.completed);
    return todos;
  }, [filter, todos]);

  const remainingCount = todos.filter((todo) => !todo.completed).length;

  function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTodo.trim();

    if (!title) return;

    setTodos((current) => [
      ...current,
      { id: Date.now(), title, completed: false },
    ]);
    setNewTodo("");
  }

  function toggleTodo(id: number) {
    setTodos((current) =>
      current.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo,
      ),
    );
  }

  function deleteTodo(id: number) {
    setTodos((current) => current.filter((todo) => todo.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-16 text-slate-900">
      <section className="mx-auto w-full max-w-xl">
        <header className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Stay focused
          </p>
          <h1 className="text-4xl font-bold tracking-tight">My todo list</h1>
          <p className="mt-3 text-slate-500">
            Keep track of what you need to get done.
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <form
            onSubmit={addTodo}
            className="flex gap-3 border-b border-slate-100 p-5"
          >
            <label htmlFor="new-todo" className="sr-only">
              Add a new task
            </label>
            <input
              id="new-todo"
              value={newTodo}
              onChange={(event) => setNewTodo(event.target.value)}
              placeholder="What needs to be done?"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            />
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              Add
            </button>
          </form>

          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
            <p className="text-sm text-slate-500">
              {remainingCount} {remainingCount === 1 ? "task" : "tasks"} left
            </p>
            <div
              className="flex rounded-lg bg-slate-100 p-1"
              aria-label="Filter tasks"
            >
              {(["all", "active", "completed"] as Filter[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilter(option)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize transition ${
                    filter === option
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <ul className="divide-y divide-slate-100">
            {filteredTodos.map((todo) => (
              <li
                key={todo.id}
                className="group flex items-center gap-3 px-5 py-4"
              >
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => toggleTodo(todo.id)}
                  aria-label={`Mark ${todo.title} as ${
                    todo.completed ? "active" : "completed"
                  }`}
                  className="size-5 cursor-pointer accent-blue-600"
                />
                <span
                  className={`min-w-0 flex-1 ${
                    todo.completed
                      ? "text-slate-400 line-through"
                      : "text-slate-700"
                  }`}
                >
                  {todo.title}
                </span>
                <button
                  type="button"
                  onClick={() => deleteTodo(todo.id)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
                  aria-label={`Delete ${todo.title}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>

          {filteredTodos.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="font-medium text-slate-700">No tasks here</p>
              <p className="mt-1 text-sm text-slate-400">
                Add a task or choose another filter.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
