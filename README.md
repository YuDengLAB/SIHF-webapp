# SIHF-webapp
Web application and backend code for the smartphone-interfaced handheld fluorometer (SIHF) used for quantitative fluorescence readout of whole-cell biosensors, as described in the accompanying manuscript.
# Overview
This repository contains the web application code used in the Smartphone-Interfaced Handheld Fluorometer (SIHF) developed in our study on portable quantitative nitrate biosensing. The application provides a browser-based interface for real-time visualization and quantitative interpretation of fluorescence-derived electrical signals transmitted wirelessly from the SIHF hardware. It is designed to run on smartphones, tablets, or desktop browsers without the need for dedicated software installation.
# Key Functions
The SIHF web application implements the following functions:
Reception of real-time fluorescence-derived voltage data via wireless communication
Live visualization of signal trajectories using interactive plots
Calibration-based conversion of voltage signals into quantitative biosensor outputs
Display and management of measurement results through a mobile-friendly interface
The application enables standardized and user-friendly quantitative readout of whole-cell biosensor signals under portable, field-deployable conditions.
# Technical Framework
The application is implemented as a lightweight web frontend using modern web technologies:
Frontend framework: Vue 3
Build tool: Vite
User interface components: Vant
Data visualization: ECharts
Wireless data communication: MQTT
# Usage Notes
This repository is provided as a reference implementation of the SIHF web interface.
Researchers interested in adapting the SIHF concept to other fluorescence-based biosensors may use this code as a starting point.
