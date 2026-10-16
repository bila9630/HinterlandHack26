import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Todo = {
  id: number;
  title: string;
  completed: boolean;
};

type Filter = "all" | "active" | "completed";

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("todos")
      .select("id, title, completed")
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setTodos(data);
        setLoading(false);
      });
  }, []);

  const filteredTodos = useMemo(() => {
    if (filter === "active") return todos.filter((todo) => !todo.completed);
    if (filter === "completed") return todos.filter((todo) => todo.completed);
    return todos;
  }, [filter, todos]);

  const remainingCount = todos.filter((todo) => !todo.completed).length;

  async function addTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = newTodo.trim();

    if (!title) return;

    setNewTodo("");
    const { data, error } = await supabase
      .from("todos")
      .insert({ title })
      .select("id, title, completed")
      .single();

    if (error) {
      setError(error.message);
      setNewTodo(title);
      return;
    }
    setError(null);
    setTodos((current) => [...current, data]);
  }

  async function toggleTodo(id: number) {
    const todo = todos.find((item) => item.id === id);
    if (!todo) return;

    const completed = !todo.completed;
    setTodos((current) =>
      current.map((item) => (item.id === id ? { ...item, completed } : item)),
    );

    const { error } = await supabase
      .from("todos")
      .update({ completed })
      .eq("id", id);

    if (error) {
      setError(error.message);
      setTodos((current) =>
        current.map((item) =>
          item.id === id ? { ...item, completed: !completed } : item,
        ),
      );
    }
  }

  async function deleteTodo(id: number) {
    const previous = todos;
    setTodos((current) => current.filter((todo) => todo.id !== id));

    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      setError(error.message);
      setTodos(previous);
    }
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

          {error && (
            <p className="border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-600">
              {error}
            </p>
          )}

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

          {loading && (
            <p className="px-5 py-12 text-center text-sm text-slate-400">
              Loading tasks…
            </p>
          )}

          {!loading && filteredTodos.length === 0 && (
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
