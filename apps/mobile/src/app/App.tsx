import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { ExampleScreen } from '../features/_example/screens/ExampleScreen';

const queryClient = new QueryClient();

// Root: providers, then navigation (React Navigation, ADR-03) once the first real screens exist.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ExampleScreen />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
