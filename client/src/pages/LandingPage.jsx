import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <h2>OneClick</h2>
          </div>
          <ul className="nav-menu">
            <li>
              <a href="#home">Home</a>
            </li>
            <li>
              <a href="#features">Features</a>
            </li>
            <li>
              <a href="#about">About</a>
            </li>
            <li>
              <button
                className="nav-get-started"
                onClick={() => navigate("/register")}
              >
                Get Started
              </button>
            </li>
          </ul>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero-section">
        <div className="hero-content">
          <h1>Powerful Email Management System</h1>
          <p>
            Send, track, and manage your emails with advanced features including
            bulk sending, scheduling, and detailed analytics.
          </p>
          <button className="hero-cta" onClick={() => navigate("/register")}>
            Get Started Free
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <h2 className="section-title">Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📧</div>
              <h3>Bulk Email Sending</h3>
              <p>
                Upload CSV files and send emails to multiple recipients at once
                with validation and preview.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Email Tracking</h3>
              <p>
                Track email opens and link clicks with detailed analytics and
                recipient-level insights.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏰</div>
              <h3>Email Scheduling</h3>
              <p>
                Schedule emails for specific dates, times, or recurring days of
                the week automatically.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📈</div>
              <h3>Dashboard Analytics</h3>
              <p>
                View comprehensive statistics including open rates, click rates,
                and recipient engagement.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure Authentication</h3>
              <p>
                Secure user accounts with password reset functionality and
                encrypted data storage.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✅</div>
              <h3>Real-time Updates</h3>
              <p>
                Get instant notifications when emails are opened or links are
                clicked by recipients.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <h2 className="section-title">About</h2>
          <div className="about-content">
            <p>
              EmailSystem is a comprehensive MERN-stack email management
              platform designed to help businesses and individuals manage their
              email communications efficiently. Our platform provides powerful
              features including bulk email sending, advanced tracking
              capabilities, email scheduling, and detailed analytics.
            </p>
            <p>
              Built with modern technologies including React, Node.js, Express,
              and MongoDB, EmailSystem offers a robust and scalable solution for
              all your email management needs. Whether you're sending marketing
              campaigns, newsletters, or transactional emails, our platform has
              you covered.
            </p>
            <p>
              With real-time tracking, you can monitor email performance, track
              recipient engagement, and make data-driven decisions to improve
              your email campaigns. Our intuitive dashboard provides all the
              insights you need at a glance.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <p>&copy; 2024 EmailSystem. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
