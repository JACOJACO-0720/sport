import React from "react";
import { Box, Typography, CssBaseline } from "@mui/material";
import Sidebar from "./Sidebar";
import ContentArea from "./ContentArea";

function App() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <CssBaseline />
      <Typography variant="h4" component="h1" sx={{ marginTop: 4 }}>
        智感悦动 - 运动姿态识别
      </Typography>
      <Box sx={{ display: "flex", width: "80%", marginTop: 4 }}>
        <Sidebar />
        <ContentArea />
      </Box>
    </Box>
  );
}

export default App;
