import { Link } from 'react-router-dom';
import { AuthShell } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <AuthShell title="Page not found" subtitle="The page you’re looking for doesn’t exist.">
      <Link to="/" className="btn-primary w-full">Go to the home page</Link>
    </AuthShell>
  );
}
