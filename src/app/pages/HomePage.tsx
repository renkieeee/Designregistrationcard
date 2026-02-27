import { Link } from 'react-router';

export function HomePage() {
  return (
    <div className="size-full flex items-center justify-center bg-background p-6">
      <div className="text-center" style={{ fontFamily: "'Poppins', sans-serif" }}>
        <h1 className="text-4xl font-semibold text-white mb-8">Welcome Home</h1>
        <Link
          to="/admin"
          className="inline-block bg-[#06b6d4] text-white px-8 py-4 rounded-xl hover:bg-[#0891b2] transition-colors duration-200 font-semibold shadow-lg shadow-[#06b6d4]/20"
        >
          Go to Admin Dashboard
        </Link>
      </div>
    </div>
  );
}