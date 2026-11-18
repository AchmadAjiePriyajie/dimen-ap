'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto max-w-lg p-6 text-center">
      <h2 className="text-lg font-bold text-red-700">Aksi tidak dapat diproses</h2>
      <p className="mt-2 text-sm text-slate-600">
        {error.message?.includes('Server Components')
          ? 'Kemungkinan peran Anda tidak berwenang atau input tidak valid. Ganti peran di header lalu coba lagi.'
          : error.message}
      </p>
      <button className="btn-primary mt-4" onClick={reset}>
        Kembali
      </button>
    </div>
  );
}
