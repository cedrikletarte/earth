import CssBaseline from "@mui/material/CssBaseline";
import { StyledEngineProvider } from "@mui/material/styles";
import CesiumViewer from "./app/components/CesiumViewer";

export default function App() {
  return (
    <StyledEngineProvider injectFirst>
      <CssBaseline />
      <CesiumViewer />
    </StyledEngineProvider>
  );
}
