import React from "react";
import "./Loader.css";

const Loader = () => {
  return (
    <div className="loader-container">
      <div className="spinner" />
      <p>Connecting you to a match...</p>
    </div>
  );
};

export default Loader;
