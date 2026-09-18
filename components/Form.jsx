export default function Form({ onSubmit, children }) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {children}
    </form>
  );
}
