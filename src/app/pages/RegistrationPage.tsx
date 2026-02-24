import { RegistrationCard } from '../components/RegistrationCard';
import { Link } from 'react-router';

export function RegistrationPage() {
  return (
    <div className="size-full flex items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center w-full max-w-5xl">
        <RegistrationCard />
        <p className="mt-6 text-sm" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <span className="text-gray-400">Already have an account?</span>{' '}
          <Link to="/" className="text-[#06b6d4] hover:text-[#0891b2] transition-colors font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}