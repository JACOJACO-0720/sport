import React from "react";
import { Box, Typography, CssBaseline } from "@mui/material";
import Sidebar from "./Sidebar";
import ContentArea from "./ContentArea";

function App() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <CssBaseline />
      <Box sx={{ display: "flex", width: "80%", marginTop: 4 }}>
        <Sidebar />
        <ContentArea />
      </Box>
    </Box>
  );
}

export default App;
