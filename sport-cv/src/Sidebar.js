import React from "react";
import { Box, Typography, List, ListItem, ListItemText } from "@mui/material";

function Sidebar() {
  return (
    <Box
      sx={{
        width: 200,
        marginRight: 2,
        padding: 2,
        backgroundColor: "#f0f0f0",
        borderRadius: 1,
      }}
    >
      <Typography variant="h6" component="h2" gutterBottom>
        Category
      </Typography>
      <List>
        <ListItem button>
          <ListItemText primary="basketball" />
        </ListItem>
      </List>
    </Box>
  );
}

export default Sidebar;
