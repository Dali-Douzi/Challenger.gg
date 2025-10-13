import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, Container } from "@mui/material";
import { useAuth } from "../context/AuthContext";

// Import footer component
import Footer from "../components/Footer";

// Import images (make sure these exist in your project)
// If you don't have these images, you can replace them with placeholder colors
import teamsBg from "../images/teams-bg.jpg";
import scrimsBg from "../images/scrims-bg.jpg";
import tournamentsBg from "../images/tournaments-bg.jpg";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const sections = [
    {
      title: "Teams",
      description:
        "Join or create professional esports teams and compete at the highest level",
      link: "/teams",
      palette: "primary",
      image: teamsBg,
      gradient: "linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 200, 200, 0.1) 100%)",
    },
    {
      title: "Scrims",
      description:
        "Practice with competitive scrimmage matches and improve your skills",
      link: "/scrims",
      palette: "secondary",
      image: scrimsBg,
      gradient: "linear-gradient(135deg, rgba(255, 0, 255, 0.2) 0%, rgba(200, 0, 200, 0.1) 100%)",
    },
    {
      title: "Tournaments",
      description:
        "Compete in tournaments with prize pools and climb the rankings",
      link: "/tournaments",
      palette: "warning",
      image: tournamentsBg,
      gradient: "linear-gradient(135deg, rgba(255, 180, 0, 0.2) 0%, rgba(200, 140, 0, 0.1) 100%)",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Container maxWidth="lg" sx={{ flex: 1 }}>
        {/* Hero Section */}
        <Box
          sx={{
            py: { xs: 6, md: 10 },
            textAlign: "center",
            color: "white",
          }}
        >
          <Typography
            variant="h2"
            sx={{
              fontWeight: "bold",
              mb: 2,
              fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
            }}
          >
            Welcome{user?.username ? `, ${user.username}` : ""} to{" "}
            <Box
              component="span"
              sx={{
                background: "linear-gradient(45deg, #00FFFF 30%, #FF00FF 90%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Challenger
            </Box>
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: "text.secondary",
              mb: 4,
              fontSize: { xs: "1rem", sm: "1.25rem" },
            }}
          >
            The Ultimate Esports Platform
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              maxWidth: 600,
              mx: "auto",
            }}
          >
            Join teams, practice in scrims, and compete in tournaments
          </Typography>
        </Box>

        {/* Stacked Section Cards */}
        <Box
          sx={{
            pb: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: { xs: 4, md: 6 },
          }}
        >
          {sections.map(({ title, description, link, palette, image, gradient }) => (
            <Box
              key={title}
              sx={{
                position: "relative",
                overflow: "hidden",
                width: { xs: "100%", sm: "90%", md: "85%" },
                minHeight: { xs: "400px", sm: "500px", md: "60vh" },
                backgroundColor: "background.paper",
                borderRadius: 3,
                border: "2px solid",
                borderColor: (theme) => theme.palette[palette].main,
                boxShadow: `0 8px 32px ${palette === "primary" ? "rgba(0, 255, 255, 0.2)" : palette === "secondary" ? "rgba(255, 0, 255, 0.2)" : "rgba(255, 180, 0, 0.2)"}`,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "translateY(-8px)",
                  boxShadow: `0 12px 48px ${palette === "primary" ? "rgba(0, 255, 255, 0.3)" : palette === "secondary" ? "rgba(255, 0, 255, 0.3)" : "rgba(255, 180, 0, 0.3)"}`,
                },
              }}
            >
              {/* Background image */}
              <Box
                component="img"
                src={image}
                alt={`${title} background`}
                onError={(e) => {
                  // Fallback if image doesn't load
                  e.target.style.display = "none";
                }}
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.15,
                  zIndex: 0,
                }}
              />

              {/* Gradient overlay */}
              <Box
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  background: gradient,
                  zIndex: 1,
                }}
              />

              {/* Content overlay */}
              <Box
                sx={{
                  position: "relative",
                  zIndex: 2,
                  p: { xs: 3, sm: 4, md: 6 },
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    color: (theme) => theme.palette[palette].main,
                    fontWeight: "bold",
                    mb: 3,
                    fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                    textShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  {title}
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: "text.primary",
                    mb: 4,
                    maxWidth: 600,
                    fontSize: { xs: "0.9rem", sm: "1rem", md: "1.1rem" },
                    lineHeight: 1.6,
                  }}
                >
                  {description}
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate(link)}
                  sx={{
                    backgroundColor: (theme) => theme.palette[palette].main,
                    color: "#000",
                    fontWeight: "bold",
                    fontSize: { xs: "0.9rem", sm: "1rem" },
                    px: { xs: 3, sm: 4 },
                    py: { xs: 1.2, sm: 1.5 },
                    borderRadius: 2,
                    boxShadow: `0 4px 16px ${palette === "primary" ? "rgba(0, 255, 255, 0.4)" : palette === "secondary" ? "rgba(255, 0, 255, 0.4)" : "rgba(255, 180, 0, 0.4)"}`,
                    transition: "all 0.3s ease",
                    "&:hover": {
                      backgroundColor: (theme) => theme.palette[palette].dark,
                      transform: "scale(1.05)",
                      boxShadow: `0 6px 24px ${palette === "primary" ? "rgba(0, 255, 255, 0.6)" : palette === "secondary" ? "rgba(255, 0, 255, 0.6)" : "rgba(255, 180, 0, 0.6)"}`,
                    },
                  }}
                >
                  Explore {title}
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Footer */}
      <Footer />
    </Box>
  );
};

export default Dashboard;