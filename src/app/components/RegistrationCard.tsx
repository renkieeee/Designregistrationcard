import { useState } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface Member {
  id: string;
  memberNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currentPointsBalance: number;
  createdAt: string;
}

export function RegistrationCard() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [registeredMember, setRegisteredMember] = useState<Member | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setRegisteredMember(null);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-3424be34/register-member`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register member');
      }

      setMessage({
        type: 'success',
        text: 'Registration successful! Welcome to our loyalty program.',
      });
      
      setRegisteredMember(data.member);
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
      });
      
      console.log('Member registered:', data.member);
    } catch (error) {
      console.error('Registration error:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Registration failed. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-lg p-8" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <h1 className="mb-8 text-center font-semibold">
        Loyalty Program
      </h1>
      
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      {registeredMember && (
        <div className="mb-6 p-5 rounded-xl bg-[#06b6d4] text-white">
          <p className="text-sm opacity-90 mb-1">Your Member Number</p>
          <p className="text-2xl font-semibold mb-3">
            {registeredMember.memberNumber}
          </p>
          <div className="text-sm opacity-90">
            <p>Points Balance: <span className="font-semibold">{registeredMember.currentPointsBalance}</span></p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="firstName" className="block mb-2 text-gray-700">
            First Name
          </label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-input-background rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#06b6d4] transition-all"
            required
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block mb-2 text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-input-background rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#06b6d4] transition-all"
            required
          />
        </div>

        <div>
          <label htmlFor="email" className="block mb-2 text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-input-background rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#06b6d4] transition-all"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block mb-2 text-gray-700">
            Phone Number
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-3 bg-input-background rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#06b6d4] transition-all"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#06b6d4] text-white py-3.5 rounded-xl hover:bg-[#0891b2] transition-colors duration-200 mt-6 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSubmitting ? 'Registering...' : 'Register Member'}
        </button>
      </form>
    </div>
  );
}