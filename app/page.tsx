import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="bg-slate-900 rounded-3xl shadow-2xl p-10 w-full max-w-md text-center border border-slate-800">

        <Image
          src="/images/logo.jpg"
          alt="Grupo Jovens de Serzedo"
          width={180}
          height={180}
          className="mx-auto rounded-xl"
        />

        <h1 className="text-5xl font-bold text-orange-500 mt-8">
          GjsPOS
        </h1>

        <p className="text-gray-300 mt-2">
          Grupo Jovens de Serzedo
        </p>

        <Link
  href="/dashboard"
  className="mt-10 block w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-xl text-lg font-bold transition"
>
  Entrar
</Link>

      </div>
    </main>
  );
}