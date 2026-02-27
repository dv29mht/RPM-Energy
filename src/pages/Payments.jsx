import { Lock } from 'lucide-react';

export default function Payments() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
          <Lock className="w-8 h-8 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
        <p className="text-slate-500 max-w-sm">
          UPI payment tracking, renewal reminders, and payment history are coming in a future version.
        </p>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
          Coming Soon
        </span>
      </div>
    </div>
  );
}
