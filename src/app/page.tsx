import uz from "@/locales/uz.json";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-12 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50 sm:text-5xl">
          {uz.home.title}
        </h1>
        <p className="text-base font-medium text-emerald-400 sm:text-lg">
          {uz.home.subtitle}
        </p>
      </div>
    </main>
  );
}
