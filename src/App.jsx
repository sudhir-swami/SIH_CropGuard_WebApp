import { useState } from "react";
import "./App.css";

function App() {
  
  // Image State
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

 
  // Location State
 
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState("");

  
  // Weather State
  
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  
  // AI Analysis State
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState("");

 
  // IMAGE UPLOAD
 
  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) return;

    // File size check
    if (file.size > 10 * 1024 * 1024) {
      alert("Image size must be less than 10MB.");
      return;
    }

    // File type check
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please upload a JPG, PNG or WEBP image.");
      return;
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));

    // Clear old analysis
    setAnalysisResult(null);
    setAnalysisError("");
  };


  // WEATHER DESCRIPTION


  const getWeatherDescription = (code) => {
    const weatherCodes = {
      0: "Clear Sky",
      1: "Mainly Clear",
      2: "Partly Cloudy",
      3: "Overcast",

      45: "Foggy",
      48: "Foggy",

      51: "Drizzle",
      53: "Drizzle",
      55: "Drizzle",

      61: "Rain",
      63: "Rain",
      65: "Heavy Rain",

      66: "Freezing Rain",
      67: "Freezing Rain",

      71: "Snow",
      73: "Snow",
      75: "Heavy Snow",
      77: "Snow Grains",

      80: "Rain Showers",
      81: "Rain Showers",
      82: "Heavy Rain Showers",

      95: "Thunderstorm",
      96: "Thunderstorm",
      99: "Thunderstorm",
    };

    return weatherCodes[code] || "Unknown Weather";
  };

  
  // WEATHER RISK
 

  const getRiskLevel = (humidity) => {
    if (humidity >= 80) {
      return {
        level: "High",
        message:
          "High humidity detected. Conditions may increase crop disease risk.",
      };
    }

    if (humidity >= 65) {
      return {
        level: "Moderate",
        message:
          "Moderate humidity detected. Monitor the crop regularly.",
      };
    }

    return {
      level: "Low",
      message:
        "Low humidity detected. Current environmental conditions look relatively favorable.",
    };
  };

 
  // GET WEATHER
  

  const getWeather = async (latitude, longitude) => {
    setWeatherLoading(true);
    setWeatherError("");

    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${latitude}` +
        `&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m` +
        `&temperature_unit=celsius` +
        `&wind_speed_unit=kmh`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Unable to fetch weather data.");
      }

      const data = await response.json();

      const temperature = data.current.temperature_2m;
      const humidity = data.current.relative_humidity_2m;
      const weatherCode = data.current.weather_code;
      const windSpeed = data.current.wind_speed_10m;

      const risk = getRiskLevel(humidity);

      setWeather({
        temperature,
        humidity,
        weatherCode,
        windSpeed,
        condition: getWeatherDescription(weatherCode),
        riskLevel: risk.level,
        riskMessage: risk.message,
      });
    } catch (error) {
      console.error("Weather error:", error);
      setWeatherError(
        "Weather information could not be loaded. Please try again."
      );
    } finally {
      setWeatherLoading(false);
    }
  };


  // GET LOCATION


  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by your browser."
      );
      return;
    }

    setLocationLoading(true);
    setLocationError("");
    setWeather(null);
    setWeatherError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        setLocation({
          latitude,
          longitude,
          accuracy,
        });

        setLocationLoading(false);

        // Automatically get weather
        await getWeather(latitude, longitude);
      },

      (error) => {
        console.error("Location error:", error);

        setLocationLoading(false);

        if (error.code === 1) {
          setLocationError(
            "Location permission denied. Please allow location access."
          );
        } else if (error.code === 2) {
          setLocationError(
            "Location unavailable. Please try again."
          );
        } else if (error.code === 3) {
          setLocationError(
            "Location request timed out. Please try again."
          );
        } else {
          setLocationError(
            "Unable to detect your location."
          );
        }
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  
  // AI ANALYSIS
const handleAnalyze = async () => {
  if (!selectedImage) {
    alert("Please select a crop image first.");
    return;
  }

  setAnalyzing(true);
  setAnalysisResult(null);
  setAnalysisError("");

  try {
    const formData = new FormData();

    // Leaf image
    formData.append("file", selectedImage);

    // GPS data
    if (location) {
      formData.append("latitude", location.latitude);
      formData.append("longitude", location.longitude);
    }

    // Weather data
    if (weather) {
      formData.append("temperature", weather.temperature);
      formData.append("humidity", weather.humidity);
      formData.append("windSpeed", weather.windSpeed);
    }

    const response = await fetch(
      "http://127.0.0.1:8000/predict",
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(
        `Server error: ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(
        data.message || "Disease detection failed."
      );
    }

    setAnalysisResult(data);

  } catch (error) {
    console.error("Prediction error:", error);

    setAnalysisError(
      error.message ||
        "Something went wrong while analyzing the image."
    );
  } finally {
    setAnalyzing(false);
  }
};


  // UI
 

  return (
    <div className="app">

      {/* ===================
          NAVBAR
      ============== */}

      <nav className="navbar">
        <div className="navbar-container">

          <div className="logo">
            <span className="logo-icon">🌱</span>
            <span>CropGuard</span>
          </div>

          <div className="nav-links">
            <a href="#home">Home</a>
            <a href="#detect">Detect Disease</a>
            <a href="#features">Features</a>
            <a href="#about">About</a>
          </div>

        </div>
      </nav>

      {/* ==============
          HERO
    ===== */}

      <section className="hero" id="home">

        <div className="hero-content">

          <span className="hero-badge">
            🌾 AI-Powered Crop Protection
          </span>

          <h1>
            Protect Your Crops
            <br />
            With <span>Smart AI</span>
          </h1>

          <p>
            Detect crop diseases early using AI image analysis,
            GPS-based weather information and smart agricultural
            recommendations.
          </p>

          <a href="#detect" className="hero-button">
            Detect Crop Disease →
          </a>

        </div>

      </section>

      {/* =============
          DETECTION SECTION
     ================ */}

      <section className="detect-section" id="detect">

        <div className="section-heading">

          <span className="section-label">
            AI CROP DETECTION
          </span>

          <h2>
            Analyze Your Crop
          </h2>

          <p>
            Upload a clear photo of your crop leaf to detect
            possible diseases.
          </p>

        </div>

        {/* ==================
            UPLOAD CARD
        ========== */}

        <div className="upload-card">

          <div className="upload-area">

            {!imagePreview ? (

              <>
                <div className="upload-icon">
                  📷
                </div>

                <h3>
                  Upload Leaf Image
                </h3>

                <p>
                  JPG, PNG up to 10MB
                </p>

                <label className="choose-button">
                  Choose Image

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg,image/webp"
                    onChange={handleImageChange}
                    hidden
                  />
                </label>
              </>

            ) : (

              <div className="image-preview-container">

                <img
                  src={imagePreview}
                  alt="Selected crop"
                  className="image-preview"
                />

                <div className="image-info">

                  <h3>
                    Image Selected ✓
                  </h3>

                  <p>
                    {selectedImage?.name}
                  </p>

                  <p>
                    {(selectedImage?.size / 1024).toFixed(1)} KB
                  </p>

                  <label className="change-image-button">
                    Change Image

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,image/webp"
                      onChange={handleImageChange}
                      hidden
                    />
                  </label>

                </div>

              </div>

            )}

          </div>

          {/* ANALYZE BUTTON */}

          <button
            className="analyze-button"
            onClick={handleAnalyze}
            disabled={!selectedImage || analyzing}
          >
            {analyzing
              ? "🔄 Analyzing Crop..."
              : "🔬 Analyze Crop"}
          </button>

        </div>

        {/* ============
            LOCATION
        ============= */}

        <div className="location-card">

          <div className="location-icon">
            📍
          </div>

          <div className="location-content">

            {!location ? (

              <>
                <h3>
                  Detect Your Location
                </h3>

                <p>
                  Get your farm location automatically using GPS.
                </p>

                <button
                  className="location-button"
                  onClick={getLocation}
                  disabled={locationLoading}
                >
                  {locationLoading
                    ? "Detecting Location..."
                    : "Get My Location"}
                </button>
              </>

            ) : (

              <>
                <div className="location-title-row">

                  <div>
                    <h3>
                      Location Detected
                    </h3>

                    <p>
                      Lat: {location.latitude.toFixed(5)}
                      {" | "}
                      Long: {location.longitude.toFixed(5)}
                    </p>
                  </div>

                  <button
                    className="refresh-location"
                    onClick={getLocation}
                    title="Refresh location"
                  >
                    ↻
                  </button>

                </div>

                <p className="location-accuracy">
                  GPS accuracy: approximately{" "}
                  {Math.round(location.accuracy)} meters
                </p>

              </>
            )}

          </div>

        </div>

        {/* LOCATION ERROR */}

        {locationError && (
          <div className="location-error">
            ⚠️ {locationError}
          </div>
        )}

        {/* ==============
            WEATHER
        ========== */}

        {weatherLoading && (
          <div className="weather-loading">
            🌦️ Loading field weather...
          </div>
        )}

        {weatherError && (
          <div className="weather-error">
            ⚠️ {weatherError}
          </div>
        )}

        {weather && (

          <div className="weather-card">

            <div className="weather-header">

              <div className="weather-icon">
                🌦️
              </div>

              <div>
                <h3>
                  Field Weather
                </h3>

                <p>
                  Current environmental conditions
                </p>
              </div>

            </div>

            <div className="weather-main">

              {/* Temperature */}

              <div className="weather-stat temperature-stat">

                <strong>
                  {weather.temperature}°C
                </strong>

                <span>
                  {weather.condition}
                </span>

              </div>

              {/* Humidity */}

              <div className="weather-stat">

                <div className="stat-icon">
                  💧
                </div>

                <strong>
                  {weather.humidity}%
                </strong>

                <span>
                  Humidity
                </span>

              </div>

              {/* Wind */}

              <div className="weather-stat">

                <div className="stat-icon">
                  💨
                </div>

                <strong>
                  {weather.windSpeed} km/h
                </strong>

                <span>
                  Wind
                </span>

              </div>

            </div>

            {/* RISK */}

            <div
              className={`risk-box risk-${weather.riskLevel.toLowerCase()}`}
            >

              <strong>
                Environmental Risk: {weather.riskLevel}
              </strong>

              <p>
                {weather.riskMessage}
              </p>

            </div>

            <p className="weather-note">
              Weather is used as supporting environmental
              context, not as a standalone disease diagnosis.
            </p>

          </div>

        )}

        {/* =========
            AI ANALYSIS LOADING
        ==== */}

        {analyzing && (

          <div className="analysis-loading">

            <div className="loading-spinner"></div>

            <h3>
              Analyzing Crop...
            </h3>

            <p>
              CropGuard AI is checking the uploaded leaf image.
            </p>

          </div>

        )}

        {/* ==========
            AI ERROR
       ============== */}

        {analysisError && (

          <div className="analysis-error">

            <h3>
              ⚠️ Analysis Failed
            </h3>

            <p>
              {analysisError}
            </p>

            <p className="error-help">
              Make sure the FastAPI server is running on
              port 8000.
            </p>

          </div>

        )}

        {/* ============
            AI RESULT
       ============ */}

        {analysisResult && (

          <div className="analysis-result">

            <div className="result-header">

              <div>

                <span className="result-label">
                  AI ANALYSIS
                </span>

                <h2>
                  {analysisResult.disease}
                </h2>

              </div>

              <div className="confidence">

                <strong>
                  {analysisResult.confidence}%
                </strong>

                <span>
                  Confidence
                </span>

              </div>

            </div>

            {/* STATUS */}

            <div className="result-status">
              🦠 {analysisResult.status}
            </div>

            {/* TREATMENT */}

            <div className="result-section">

              <h3>
                💊 Treatment
              </h3>

              <ul>

                {analysisResult.treatment?.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}

              </ul>

            </div>

            {/* PREVENTION */}

            <div className="result-section">

              <h3>
                🛡️ Prevention
              </h3>

              <ul>

                {analysisResult.prevention?.map(
                  (item, index) => (
                    <li key={index}>
                      {item}
                    </li>
                  )
                )}

              </ul>

            </div>

            {/* DEMO NOTICE */}

            <div className="result-warning">
              🤖 <strong>AI Model:</strong> Prediction generated using
              CropGuard's trained ResNet18 model. This result is intended
              for prototype decision support and should be verified by
              an agricultural expert.
            </div>

          </div>

        )}

      </section>

      {/* ==============
          FEATURES
     =================== */}

      <section className="features-section" id="features">

        <div className="section-heading">

          <span className="section-label">
            CROPGUARD FEATURES
          </span>

          <h2>
            Smart Farming Assistance
          </h2>

        </div>

        <div className="features-grid">

          <div className="feature-card">

            <div className="feature-icon">
              🤖
            </div>

            <h3>
              AI Disease Detection
            </h3>

            <p>
              Analyze crop leaf images and identify possible
              diseases using AI.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">
              📍
            </div>

            <h3>
              GPS Location
            </h3>

            <p>
              Automatically detect the farmer's location for
              environmental analysis.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">
              🌦️
            </div>

            <h3>
              Weather Intelligence
            </h3>

            <p>
              Use temperature, humidity and wind conditions as
              supporting environmental context.
            </p>

          </div>

          <div className="feature-card">

            <div className="feature-icon">
              🛡️
            </div>

            <h3>
              Smart Advisory
            </h3>

            <p>
              Provide treatment and prevention guidance based
              on detected crop conditions.
            </p>

          </div>

        </div>

      </section>

      {/* ==============
          ABOUT
     ============= */}

      <section className="about-section" id="about">

        <div className="about-content">

          <span className="section-label">
            ABOUT CROPGUARD
          </span>

          <h2>
            Helping Farmers Protect
            <br />
            Their Crops Earlier
          </h2>

          <p>
            CropGuard combines AI-based image analysis,
            environmental information and farmer-friendly
            recommendations to support early crop disease
            detection and better decision making.
          </p>

        </div>

      </section>

      {/* ==============
          FOOTER
      ================= */}

      <footer className="footer">

        <div className="footer-content">

          <div className="logo">
            <span className="logo-icon">🌱</span>
            <span>CropGuard</span>
          </div>

          <p>
            AI-powered crop protection for smarter farming.
          </p>

          <span>
            © 2026 CropGuard
          </span>

        </div>

      </footer>

    </div>
  );
}

export default App;
