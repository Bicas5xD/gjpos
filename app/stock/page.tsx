import Sidebar from "@/components/Sidebar";

export default function Stock() {
  return (
    <main className="flex min-h-screen bg-slate-950">
      <Sidebar />

      <section className="flex-1 p-10 text-white">
        <h1 className="text-4xl font-bold text-orange-500">
          Stock
        </h1>

        <p className="mt-6 text-gray-400">
          Em desenvolvimento...
        </p>
      </section>
    </main>
  );
}