import { createTheme } from "@mui/material/styles";

/**
 * Custom Material-UI Theme
 * Professional dark theme with neon accents for esports platform
 */

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#00FFFF", // Neon Cyan
      light: "#5DFDFD",
      dark: "#00CCCC",
      contrastText: "#000000",
    },
    secondary: {
      main: "#FF00FF", // Neon Magenta
      light: "#FF5DFF",
      dark: "#CC00CC",
      contrastText: "#000000",
    },
    warning: {
      main: "#FFB400", // Bright Orange
      light: "#FFC947",
      dark: "#CC9000",
      contrastText: "#000000",
    },
    error: {
      main: "#FF1744",
      light: "#FF5370",
      dark: "#CC1236",
      contrastText: "#ffffff",
    },
    success: {
      main: "#00E676",
      light: "#47EE91",
      dark: "#00B85E",
      contrastText: "#000000",
    },
    info: {
      main: "#00B8D4",
      light: "#47C6DD",
      dark: "#0093A9",
      contrastText: "#000000",
    },
    background: {
      default: "#121212",
      paper: "#1C1C1C",
    },
    text: {
      primary: "#FFFFFF",
      secondary: "#AAAAAA",
      disabled: "#666666",
    },
    divider: "rgba(255, 255, 255, 0.12)",
    action: {
      active: "#FFFFFF",
      hover: "rgba(255, 255, 255, 0.08)",
      selected: "rgba(255, 255, 255, 0.16)",
      disabled: "rgba(255, 255, 255, 0.3)",
      disabledBackground: "rgba(255, 255, 255, 0.12)",
    },
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    h1: {
      fontSize: "3rem",
      fontWeight: 700,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "2.5rem",
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: "2rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontSize: "1.25rem",
      fontWeight: 600,
      lineHeight: 1.5,
    },
    h6: {
      fontSize: "1rem",
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: "1rem",
      lineHeight: 1.5,
    },
    body2: {
      fontSize: "0.875rem",
      lineHeight: 1.5,
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    "none",
    "0px 2px 4px rgba(0,0,0,0.2)",
    "0px 4px 8px rgba(0,0,0,0.2)",
    "0px 6px 12px rgba(0,0,0,0.25)",
    "0px 8px 16px rgba(0,0,0,0.3)",
    "0px 10px 20px rgba(0,0,0,0.3)",
    "0px 12px 24px rgba(0,0,0,0.35)",
    "0px 14px 28px rgba(0,0,0,0.35)",
    "0px 16px 32px rgba(0,0,0,0.4)",
    "0px 18px 36px rgba(0,0,0,0.4)",
    "0px 20px 40px rgba(0,0,0,0.45)",
    "0px 22px 44px rgba(0,0,0,0.45)",
    "0px 24px 48px rgba(0,0,0,0.5)",
    "0px 26px 52px rgba(0,0,0,0.5)",
    "0px 28px 56px rgba(0,0,0,0.55)",
    "0px 30px 60px rgba(0,0,0,0.55)",
    "0px 32px 64px rgba(0,0,0,0.6)",
    "0px 34px 68px rgba(0,0,0,0.6)",
    "0px 36px 72px rgba(0,0,0,0.65)",
    "0px 38px 76px rgba(0,0,0,0.65)",
    "0px 40px 80px rgba(0,0,0,0.7)",
    "0px 42px 84px rgba(0,0,0,0.7)",
    "0px 44px 88px rgba(0,0,0,0.75)",
    "0px 46px 92px rgba(0,0,0,0.75)",
    "0px 48px 96px rgba(0,0,0,0.8)",
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: "#6b6b6b #2b2b2b",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            width: 8,
            height: 8,
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: "#6b6b6b",
            minHeight: 24,
          },
          "&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover": {
            backgroundColor: "#959595",
          },
          "&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track": {
            borderRadius: 8,
            backgroundColor: "#2b2b2b",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 16px",
          fontSize: "0.875rem",
          fontWeight: 600,
          transition: "all 0.3s ease",
        },
        contained: {
          boxShadow: "0px 4px 12px rgba(0, 255, 255, 0.3)",
          "&:hover": {
            boxShadow: "0px 6px 16px rgba(0, 255, 255, 0.5)",
            transform: "translateY(-2px)",
          },
        },
        outlined: {
          borderWidth: 2,
          "&:hover": {
            borderWidth: 2,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: "none",
          backgroundColor: "#1C1C1C",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          "&:hover": {
            transform: "translateY(-4px)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#1C1C1C",
        },
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: "0px 2px 8px rgba(0,0,0,0.3)",
        },
        elevation2: {
          boxShadow: "0px 4px 12px rgba(0,0,0,0.3)",
        },
        elevation3: {
          boxShadow: "0px 6px 16px rgba(0,0,0,0.35)",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            "& fieldset": {
              borderWidth: 2,
            },
            "&:hover fieldset": {
              borderColor: "#00FFFF",
            },
            "&.Mui-focused fieldset": {
              borderColor: "#00FFFF",
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 600,
        },
        filled: {
          backgroundColor: "rgba(0, 255, 255, 0.2)",
          color: "#00FFFF",
          "&:hover": {
            backgroundColor: "rgba(0, 255, 255, 0.3)",
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          backgroundColor: "#1C1C1C",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          backgroundColor: "#1C1C1C",
          boxShadow: "0px 2px 12px rgba(0,0,0,0.4)",
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          border: "2px solid rgba(0, 255, 255, 0.3)",
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "&:hover": {
            backgroundColor: "rgba(0, 255, 255, 0.08)",
          },
          "&.Mui-selected": {
            backgroundColor: "rgba(0, 255, 255, 0.16)",
            "&:hover": {
              backgroundColor: "rgba(0, 255, 255, 0.24)",
            },
          },
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;