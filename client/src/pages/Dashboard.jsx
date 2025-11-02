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
      gradient: "linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(0, 100, 100, 0.4) 100%)",
      accentGradient: "linear-gradient(135deg, #00FFFF 0%, #00CCCC 100%)",
    },
    {
      title: "Scrims",
      description:
        "Practice with competitive scrimmage matches and improve your skills",
      link: "/scrims",
      palette: "secondary",
      image: scrimsBg,
      gradient: "linear-gradient(135deg, rgba(255, 0, 255, 0.15) 0%, rgba(100, 0, 100, 0.4) 100%)",
      accentGradient: "linear-gradient(135deg, #FF00FF 0%, #CC00CC 100%)",
    },
    {
      title: "Tournaments",
      description:
        "Compete in tournaments with prize pools and climb the rankings",
      link: "/tournaments",
      palette: "warning",
      image: tournamentsBg,
      gradient: "linear-gradient(135deg, rgba(255, 180, 0, 0.15) 0%, rgba(150, 100, 0, 0.4) 100%)",
      accentGradient: "linear-gradient(135deg, #FFB400 0%, #FF8C00 100%)",
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
      <Container maxWidth="xl" sx={{ flex: 1, py: 4 }}>
        {/* Hero Section */}
        <Box
          sx={{
            py: { xs: 8, md: 12 },
            textAlign: "center",
            color: "white",
            mb: { xs: 4, md: 6 },
          }}
        >
          <Typography
            variant="h1"
            sx={{
              fontWeight: 900,
              mb: 3,
              fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem", lg: "5.5rem" },
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Welcome{user?.username ? `, ${user.username}` : ""}
          </Typography>
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              mb: 4,
              fontSize: { xs: "2rem", sm: "3rem", md: "4rem", lg: "5rem" },
              background: "linear-gradient(45deg, #00FFFF 20%, #FF00FF 50%, #FFB400 80%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.01em",
              textTransform: "uppercase",
              animation: "gradientShift 6s ease infinite",
              "@keyframes gradientShift": {
                "0%, 100%": {
                  backgroundPosition: "0% 50%",
                },
                "50%": {
                  backgroundPosition: "100% 50%",
                },
              },
              backgroundSize: "200% auto",
            }}
          >
            Challenger
          </Typography>
          <Box
            sx={{
              display: "inline-block",
              position: "relative",
              px: 4,
              py: 1,
              mb: 3,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.2), transparent)",
                transform: "skewX(-15deg)",
              }}
            />
            <Typography
              variant="h5"
              sx={{
                position: "relative",
                color: "#00FFFF",
                fontWeight: 700,
                fontSize: { xs: "1.1rem", sm: "1.4rem", md: "1.6rem" },
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              The Ultimate Esports Platform
            </Typography>
          </Box>
          <Typography
            variant="body1"
            sx={{
              color: "text.secondary",
              maxWidth: 700,
              mx: "auto",
              fontSize: { xs: "1rem", sm: "1.1rem", md: "1.2rem" },
              fontWeight: 300,
              lineHeight: 1.8,
            }}
          >
            Join teams • Practice in scrims • Compete in tournaments
          </Typography>

          {/* Quick Action Cards */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              gap: 3,
              maxWidth: 1000,
              mx: "auto",
              mt: { xs: "6vh", sm: "8vh", md: "10vh" },
              mb: { xs: "4vh", sm: "6vh", md: "8vh" },
            }}
          >
            <Box
              sx={{
                textAlign: "center",
                p: 4,
                borderRadius: 3,
                background: "linear-gradient(135deg, rgba(0, 255, 255, 0.08) 0%, rgba(0, 255, 255, 0.03) 100%)",
                border: "2px solid rgba(0, 255, 255, 0.2)",
                transition: "all 0.3s ease",
                cursor: "default",
                "&:hover": {
                  transform: "translateY(-8px)",
                  background: "linear-gradient(135deg, rgba(0, 255, 255, 0.12) 0%, rgba(0, 255, 255, 0.05) 100%)",
                  borderColor: "rgba(0, 255, 255, 0.4)",
                  boxShadow: "0 15px 40px rgba(0, 255, 255, 0.25)",
                },
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00FFFF 0%, #00CCCC 100%)",
                  fontSize: "2.5rem",
                }}
              >
                🎮
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: "#00FFFF",
                  mb: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Build Your Team
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  lineHeight: 1.7,
                  fontSize: "0.95rem",
                }}
              >
                Create or join competitive teams, recruit skilled players, and coordinate strategies together
              </Typography>
            </Box>

            <Box
              sx={{
                textAlign: "center",
                p: 4,
                borderRadius: 3,
                background: "linear-gradient(135deg, rgba(255, 0, 255, 0.08) 0%, rgba(255, 0, 255, 0.03) 100%)",
                border: "2px solid rgba(255, 0, 255, 0.2)",
                transition: "all 0.3s ease",
                cursor: "default",
                "&:hover": {
                  transform: "translateY(-8px)",
                  background: "linear-gradient(135deg, rgba(255, 0, 255, 0.12) 0%, rgba(255, 0, 255, 0.05) 100%)",
                  borderColor: "rgba(255, 0, 255, 0.4)",
                  boxShadow: "0 15px 40px rgba(255, 0, 255, 0.25)",
                },
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FF00FF 0%, #CC00CC 100%)",
                  fontSize: "2.5rem",
                }}
              >
                ⚔️
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: "#FF00FF",
                  mb: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Practice & Improve
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  lineHeight: 1.7,
                  fontSize: "0.95rem",
                }}
              >
                Schedule scrimmage matches against other teams to sharpen your skills and test new tactics
              </Typography>
            </Box>

            <Box
              sx={{
                textAlign: "center",
                p: 4,
                borderRadius: 3,
                background: "linear-gradient(135deg, rgba(255, 180, 0, 0.08) 0%, rgba(255, 180, 0, 0.03) 100%)",
                border: "2px solid rgba(255, 180, 0, 0.2)",
                transition: "all 0.3s ease",
                cursor: "default",
                "&:hover": {
                  transform: "translateY(-8px)",
                  background: "linear-gradient(135deg, rgba(255, 180, 0, 0.12) 0%, rgba(255, 180, 0, 0.05) 100%)",
                  borderColor: "rgba(255, 180, 0, 0.4)",
                  boxShadow: "0 15px 40px rgba(255, 180, 0, 0.25)",
                },
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  mb: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #FFB400 0%, #FF8C00 100%)",
                  fontSize: "2.5rem",
                }}
              >
                🏆
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: "#FFB400",
                  mb: 2,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Compete to Win
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  lineHeight: 1.7,
                  fontSize: "0.95rem",
                }}
              >
                Enter tournaments, climb the leaderboards, and prove your team is the best
              </Typography>
            </Box>
          </Box>

          {/* Scroll indicator */}
          <Box
            sx={{
              textAlign: "center",
              mt: 4,
              mb: 2,
              animation: "bounce 2s infinite",
              "@keyframes bounce": {
                "0%, 100%": {
                  transform: "translateY(0)",
                },
                "50%": {
                  transform: "translateY(10px)",
                },
              },
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              Explore Below
            </Typography>
            <Box
              sx={{
                fontSize: "1.5rem",
                color: "primary.main",
                mt: 1,
              }}
            >
              ↓
            </Box>
          </Box>
        </Box>

        {/* Stacked Section Cards */}
        <Box
          sx={{
            pb: 8,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: { xs: 5, md: 8 },
          }}
        >
          {sections.map(({ title, description, link, palette, image, gradient, accentGradient }, index) => (
            <Box
              key={title}
              sx={{
                position: "relative",
                overflow: "hidden",
                width: { xs: "100%", sm: "95%", md: "90%", lg: "85%" },
                height: { xs: "450px", sm: "500px", md: "550px", lg: "600px" },
                backgroundColor: "background.paper",
                borderRadius: 4,
                border: "3px solid",
                borderColor: (theme) => theme.palette[palette].main,
                boxShadow: `0 20px 60px ${palette === "primary" ? "rgba(0, 255, 255, 0.25)" : palette === "secondary" ? "rgba(255, 0, 255, 0.25)" : "rgba(255, 180, 0, 0.25)"}`,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: index % 2 === 0 ? "rotate(-0.5deg)" : "rotate(0.5deg)",
                "&:hover": {
                  transform: "translateY(-12px) scale(1.02) rotate(0deg)",
                  boxShadow: `0 30px 80px ${palette === "primary" ? "rgba(0, 255, 255, 0.4)" : palette === "secondary" ? "rgba(255, 0, 255, 0.4)" : "rgba(255, 180, 0, 0.4)"}`,
                  borderColor: (theme) => theme.palette[palette].light,
                },
              }}
            >
              {/* Background image */}
              <Box
                component="img"
                src={image}
                alt={`${title} background`}
                onError={(e) => {
                  e.target.style.display = "none";
                }}
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.2,
                  zIndex: 0,
                  filter: "brightness(0.6) contrast(1.2)",
                  transition: "all 0.4s ease",
                  ".MuiBox-root:hover &": {
                    opacity: 0.3,
                    transform: "scale(1.05)",
                  },
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

              {/* Decorative corner accent */}
              <Box
                sx={{
                  position: "absolute",
                  top: -50,
                  right: -50,
                  width: 200,
                  height: 200,
                  background: accentGradient,
                  opacity: 0.15,
                  borderRadius: "50%",
                  filter: "blur(40px)",
                  zIndex: 1,
                }}
              />

              {/* Content overlay */}
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  zIndex: 2,
                  width: "90%",
                  maxWidth: "800px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                {/* Title with accent bar */}
                <Box sx={{ position: "relative", mb: 4 }}>
                  <Box
                    sx={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%) scaleX(1.2)",
                      width: "120%",
                      height: "120%",
                      background: accentGradient,
                      opacity: 0.2,
                      filter: "blur(30px)",
                      zIndex: -1,
                    }}
                  />
                  <Typography
                    variant="h2"
                    sx={{
                      color: (theme) => theme.palette[palette].main,
                      fontWeight: 900,
                      fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem", lg: "5rem" },
                      letterSpacing: "-0.02em",
                      textTransform: "uppercase",
                      textShadow: `0 0 40px ${palette === "primary" ? "rgba(0, 255, 255, 0.6)" : palette === "secondary" ? "rgba(255, 0, 255, 0.6)" : "rgba(255, 180, 0, 0.6)"}`,
                      position: "relative",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: -10,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "60%",
                        height: "4px",
                        background: accentGradient,
                        borderRadius: 2,
                      },
                    }}
                  >
                    {title}
                  </Typography>
                </Box>

                <Typography
                  variant="h6"
                  sx={{
                    color: "text.primary",
                    mb: 5,
                    maxWidth: 600,
                    fontSize: { xs: "1rem", sm: "1.15rem", md: "1.25rem", lg: "1.35rem" },
                    lineHeight: 1.8,
                    fontWeight: 400,
                    letterSpacing: "0.01em",
                    textShadow: "0 2px 10px rgba(0, 0, 0, 0.8)",
                  }}
                >
                  {description}
                </Typography>

                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate(link)}
                  sx={{
                    background: accentGradient,
                    color: "#000",
                    fontWeight: 800,
                    fontSize: { xs: "1rem", sm: "1.1rem", md: "1.2rem" },
                    px: { xs: 4, sm: 6, md: 8 },
                    py: { xs: 1.5, sm: 2, md: 2.5 },
                    borderRadius: 50,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    boxShadow: `0 8px 30px ${palette === "primary" ? "rgba(0, 255, 255, 0.5)" : palette === "secondary" ? "rgba(255, 0, 255, 0.5)" : "rgba(255, 180, 0, 0.5)"}`,
                    border: "2px solid",
                    borderColor: (theme) => theme.palette[palette].main,
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)",
                      transition: "left 0.5s ease",
                    },
                    "&:hover": {
                      transform: "scale(1.08) translateY(-4px)",
                      boxShadow: `0 12px 40px ${palette === "primary" ? "rgba(0, 255, 255, 0.7)" : palette === "secondary" ? "rgba(255, 0, 255, 0.7)" : "rgba(255, 180, 0, 0.7)"}`,
                      "&::before": {
                        left: "100%",
                      },
                    },
                    "&:active": {
                      transform: "scale(1.02) translateY(-2px)",
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