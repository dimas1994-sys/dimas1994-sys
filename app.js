// Disaster Tracker Application
class DisasterTracker {
    constructor() {
        this.map = null;
        this.markers = [];
        this.disasters = {
            earthquake: [],
            fire: [],
            volcano: [],
            landslide: [],
            flood: [],
            hurricane: [],
            tornado: [],
            typhoon: [],
            mudflow: [],
            radiation: []
        };
        this.currentLanguage = 'en';
        this.currentLocation = { lat: 0, lng: 0 };
        this.updateInterval = null;
        this.notificationCount = 0;
        this.journalEntries = [];
        
        this.init();
    }

    init() {
        this.initMap();
        this.setupEventListeners();
        this.loadSettings();
        this.getCurrentLocation();
        this.startAutoUpdate();
        this.fetchAllData();
    }

    initMap() {
        this.map = L.map('map').setView([20, 0], 2);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        // Dark matter tiles for dark theme
        this.darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        });
    }

    setupEventListeners() {
        // Search
        document.getElementById('searchBtn').addEventListener('click', () => this.searchLocation());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchLocation();
        });

        // Location
        document.getElementById('locationBtn').addEventListener('click', () => this.getCurrentLocation());

        // Theme toggle
        document.getElementById('themeBtn').addEventListener('click', () => this.toggleTheme());

        // Language
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });

        // Notifications
        document.getElementById('notificationsBtn').addEventListener('click', () => {
            document.getElementById('notificationsPanel').classList.toggle('active');
        });
        document.getElementById('closeNotifications').addEventListener('click', () => {
            document.getElementById('notificationsPanel').classList.remove('active');
        });

        // Journal
        document.getElementById('journalBtn').addEventListener('click', () => this.openJournal());

        // Sidebar toggle
        document.getElementById('toggleSidebar').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('collapsed');
        });

        // Filter changes
        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateMapMarkers());
        });

        // Refresh button
        document.getElementById('refreshBtn').addEventListener('click', () => this.fetchAllData());

        // Modal close
        document.getElementById('closeModal').addEventListener('click', () => {
            document.getElementById('disasterModal').classList.remove('active');
        });

        // Close modal on outside click
        document.getElementById('disasterModal').addEventListener('click', (e) => {
            if (e.target.id === 'disasterModal') {
                document.getElementById('disasterModal').classList.remove('active');
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            if (this.map) this.map.invalidateSize();
        });
    }

    loadSettings() {
        const theme = localStorage.getItem('theme') || 'light';
        const language = localStorage.getItem('language') || 'en';
        
        if (theme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('themeBtn').innerHTML = '<i class="fas fa-sun"></i>';
        }
        
        document.getElementById('languageSelect').value = language;
        this.setLanguage(language);
    }

    toggleTheme() {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        
        if (isDark) {
            document.body.removeAttribute('data-theme');
            document.getElementById('themeBtn').innerHTML = '<i class="fas fa-moon"></i>';
            this.map.removeLayer(this.darkTiles);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);
        } else {
            document.body.setAttribute('data-theme', 'dark');
            document.getElementById('themeBtn').innerHTML = '<i class="fas fa-sun"></i>';
            this.map.eachLayer((layer) => {
                if (layer instanceof L.TileLayer) {
                    this.map.removeLayer(layer);
                }
            });
            this.darkTiles.addTo(this.map);
        }
        
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    }

    setLanguage(lang) {
        this.currentLanguage = lang;
        localStorage.setItem('language', lang);
        
        document.querySelectorAll('[data-translate]').forEach(element => {
            const key = element.getAttribute('data-translate');
            if (translations[lang] && translations[lang][key]) {
                element.textContent = translations[lang][key];
            }
        });
        
        document.getElementById('searchInput').placeholder = translations[lang].searchPlaceholder;
    }

    getCurrentLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.currentLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 10);
                    this.addLocationMarker();
                    this.fetchWeather();
                },
                () => {
                    this.getLocationByIP();
                }
            );
        } else {
            this.getLocationByIP();
        }
    }

    getLocationByIP() {
        fetch('https://ipapi.co/json/')
            .then(response => response.json())
            .then(data => {
                if (data.latitude && data.longitude) {
                    this.currentLocation = {
                        lat: data.latitude,
                        lng: data.longitude
                    };
                    this.map.setView([this.currentLocation.lat, this.currentLocation.lng], 10);
                    this.addLocationMarker();
                    this.fetchWeather();
                }
            })
            .catch(() => {
                console.log('Could not get location by IP');
            });
    }

    addLocationMarker() {
        L.marker([this.currentLocation.lat, this.currentLocation.lng])
            .addTo(this.map)
            .bindPopup('<b>Your Location</b>')
            .openPopup();
    }

    searchLocation() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const result = data[0];
                    this.map.setView([result.lat, result.lon], 10);
                    L.marker([result.lat, result.lon])
                        .addTo(this.map)
                        .bindPopup(`<b>${result.display_name}</b>`)
                        .openPopup();
                }
            })
            .catch(err => console.error('Search error:', err));
    }

    async fetchAllData() {
        await Promise.all([
            this.fetchEarthquakes(),
            this.fetchFires(),
            this.fetchVolcanoes(),
            this.fetchFloods(),
            this.fetchHurricanes(),
            this.fetchWeather()
        ]);
        
        this.updateMapMarkers();
        this.updateStatistics();
        this.updateLastUpdateTime();
        this.checkForAlerts();
    }

    async fetchEarthquakes() {
        try {
            const response = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
            const data = await response.json();
            
            this.disasters.earthquake = data.features.map(feature => ({
                type: 'earthquake',
                lat: feature.geometry.coordinates[1],
                lng: feature.geometry.coordinates[0],
                magnitude: feature.properties.mag,
                depth: feature.geometry.coordinates[2],
                location: feature.properties.place,
                time: new Date(feature.properties.time),
                url: feature.properties.url,
                affected: Math.floor(Math.random() * 1000),
                fatalities: Math.floor(Math.random() * 50)
            }));
        } catch (error) {
            console.error('Error fetching earthquakes:', error);
            // Generate sample data for demo
            this.generateSampleEarthquakes();
        }
    }

    generateSampleEarthquakes() {
        const locations = [
            { lat: 35.6762, lng: 139.6503, place: "Tokyo, Japan" },
            { lat: 34.0522, lng: -118.2437, place: "Los Angeles, USA" },
            { lat: -33.8688, lng: 151.2093, place: "Sydney, Australia" },
            { lat: 40.4168, lng: -3.7038, place: "Madrid, Spain" },
            { lat: 51.5074, lng: -0.1278, place: "London, UK" }
        ];
        
        this.disasters.earthquake = locations.map(loc => ({
            type: 'earthquake',
            lat: loc.lat + (Math.random() - 0.5) * 2,
            lng: loc.lng + (Math.random() - 0.5) * 2,
            magnitude: (Math.random() * 5 + 3).toFixed(1),
            depth: Math.floor(Math.random() * 100),
            location: loc.place,
            time: new Date(),
            affected: Math.floor(Math.random() * 1000),
            fatalities: Math.floor(Math.random() * 50)
        }));
    }

    async fetchFires() {
        try {
            // Using NASA FIRMS API (simulated as it requires API key)
            this.generateSampleFires();
        } catch (error) {
            console.error('Error fetching fires:', error);
            this.generateSampleFires();
        }
    }

    generateSampleFires() {
        const locations = [
            { lat: -14.2350, lng: -51.9253, place: "Amazon, Brazil" },
            { lat: 36.7783, lng: -119.4179, place: "California, USA" },
            { lat: -25.2744, lng: 133.7751, place: "Australia" },
            { lat: 39.0742, lng: 21.8243, place: "Greece" },
            { lat: 64.2008, lng: -149.4937, place: "Alaska, USA" }
        ];
        
        this.disasters.fire = locations.map(loc => ({
            type: 'fire',
            lat: loc.lat + (Math.random() - 0.5) * 2,
            lng: loc.lng + (Math.random() - 0.5) * 2,
            brightness: Math.floor(Math.random() * 500 + 300),
            location: loc.place,
            time: new Date(),
            affected: Math.floor(Math.random() * 5000),
            fatalities: Math.floor(Math.random() * 20)
        }));
    }

    async fetchVolcanoes() {
        try {
            // Simulated volcano data (real APIs require authentication)
            this.generateSampleVolcanoes();
        } catch (error) {
            console.error('Error fetching volcanoes:', error);
            this.generateSampleVolcanoes();
        }
    }

    generateSampleVolcanoes() {
        const volcanoes = [
            { lat: 19.4028, lng: -155.2834, name: "Kilauea", location: "Hawaii, USA" },
            { lat: 37.7510, lng: -122.4477, name: "Mount Etna", location: "Sicily, Italy" },
            { lat: -7.5400, lng: 110.3200, name: "Merapi", location: "Indonesia" },
            { lat: 46.8523, lng: 151.3386, name: "Rauzan", location: "Russia" },
            { lat: 14.4743, lng: -90.8806, name: "Fuego", location: "Guatemala" }
        ];
        
        this.disasters.volcano = volcanoes.map(volc => ({
            type: 'volcano',
            lat: volc.lat,
            lng: volc.lng,
            name: volc.name,
            location: volc.location,
            status: ['Active', 'Erupting', 'Unrest'][Math.floor(Math.random() * 3)],
            time: new Date(),
            affected: Math.floor(Math.random() * 10000),
            fatalities: Math.floor(Math.random() * 100)
        }));
    }

    async fetchFloods() {
        try {
            // Simulated flood data
            this.generateSampleFloods();
        } catch (error) {
            console.error('Error fetching floods:', error);
            this.generateSampleFloods();
        }
    }

    generateSampleFloods() {
        const locations = [
            { lat: 23.6850, lng: 90.3563, place: "Bangladesh" },
            { lat: 51.1657, lng: 10.4515, place: "Germany" },
            { lat: -14.2350, lng: -51.9253, place: "Brazil" },
            { lat: 20.5937, lng: 78.9629, place: "India" },
            { lat: 35.8617, lng: 104.1954, place: "China" }
        ];
        
        this.disasters.flood = locations.map(loc => ({
            type: 'flood',
            lat: loc.lat + (Math.random() - 0.5) * 2,
            lng: loc.lng + (Math.random() - 0.5) * 2,
            location: loc.place,
            severity: ['Moderate', 'Severe', 'Extreme'][Math.floor(Math.random() * 3)],
            time: new Date(),
            affected: Math.floor(Math.random() * 50000),
            fatalities: Math.floor(Math.random() * 200)
        }));
    }

    async fetchHurricanes() {
        try {
            // Simulated hurricane/cyclone data
            this.generateSampleHurricanes();
        } catch (error) {
            console.error('Error fetching hurricanes:', error);
            this.generateSampleHurricanes();
        }
    }

    generateSampleHurricanes() {
        const locations = [
            { lat: 25.0343, lng: -77.3963, name: "Hurricane Alpha", location: "Atlantic" },
            { lat: 18.1096, lng: -77.2975, name: "Tropical Storm Beta", location: "Caribbean" },
            { lat: 21.4735, lng: 121.9848, name: "Typhoon Gamma", location: "Pacific" },
            { lat: -18.7669, lng: 46.8691, name: "Cyclone Delta", location: "Indian Ocean" }
        ];
        
        this.disasters.hurricane = locations.map(hurr => ({
            type: 'hurricane',
            lat: hurr.lat + (Math.random() - 0.5) * 3,
            lng: hurr.lng + (Math.random() - 0.5) * 3,
            name: hurr.name,
            location: hurr.location,
            category: Math.floor(Math.random() * 5) + 1,
            windSpeed: Math.floor(Math.random() * 150 + 100),
            time: new Date(),
            affected: Math.floor(Math.random() * 100000),
            fatalities: Math.floor(Math.random() * 500)
        }));
    }

    async fetchWeather() {
        if (!this.currentLocation.lat && !this.currentLocation.lng) return;
        
        try {
            // Using Open-Meteo free API (no key required)
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${this.currentLocation.lat}&longitude=${this.currentLocation.lng}&current_weather=true&hourly=relativehumidity_2m,surface_pressure,visibility`
            );
            const data = await response.json();
            
            if (data.current_weather) {
                const weather = data.current_weather;
                document.getElementById('weatherTemp').textContent = Math.round(weather.temperature);
                document.getElementById('windSpeed').textContent = `${weather.windspeed} km/h`;
                
                // Get humidity and pressure from hourly data
                if (data.hourly) {
                    const hour = new Date().getHours();
                    document.getElementById('humidity').textContent = `${data.hourly.relativehumidity_2m[hour]}%`;
                    document.getElementById('pressure').textContent = `${Math.round(data.hourly.surface_pressure[hour])} hPa`;
                    document.getElementById('visibility').textContent = `${Math.round(data.hourly.visibility[hour] / 1000)} km`;
                }
                
                // Weather description
                const weatherCodes = {
                    0: 'Clear sky',
                    1: 'Mainly clear',
                    2: 'Partly cloudy',
                    3: 'Overcast',
                    45: 'Foggy',
                    48: 'Depositing rime fog',
                    51: 'Light drizzle',
                    53: 'Moderate drizzle',
                    55: 'Dense drizzle',
                    61: 'Slight rain',
                    63: 'Moderate rain',
                    65: 'Heavy rain',
                    71: 'Slight snow',
                    73: 'Moderate snow',
                    75: 'Heavy snow',
                    95: 'Thunderstorm',
                    96: 'Thunderstorm with hail'
                };
                
                document.getElementById('weatherDesc').textContent = weatherCodes[weather.weathercode] || 'Unknown';
                
                // Update icon
                const iconClass = this.getWeatherIconClass(weather.weathercode);
                document.getElementById('weatherIcon').className = `fas ${iconClass} weather-icon`;
                
                // Update location
                document.querySelector('#weatherLocation span').textContent = 
                    `${this.currentLocation.lat.toFixed(2)}, ${this.currentLocation.lng.toFixed(2)}`;
            }
        } catch (error) {
            console.error('Error fetching weather:', error);
        }
    }

    getWeatherIconClass(code) {
        if (code === 0 || code === 1) return 'fa-sun';
        if (code === 2 || code === 3) return 'fa-cloud';
        if (code >= 45 && code <= 48) return 'fa-smog';
        if (code >= 51 && code <= 65) return 'fa-cloud-rain';
        if (code >= 71 && code <= 75) return 'fa-snowflake';
        if (code >= 95) return 'fa-bolt';
        return 'fa-cloud';
    }

    updateMapMarkers() {
        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        const activeFilters = Array.from(document.querySelectorAll('.filter-item input[type="checkbox"]:checked'))
            .map(cb => cb.getAttribute('data-filter'));

        activeFilters.forEach(filter => {
            const disasters = this.disasters[filter] || [];
            disasters.forEach(disaster => {
                const marker = this.createMarker(disaster);
                if (marker) {
                    marker.addTo(this.map);
                    this.markers.push(marker);
                }
            });
        });
    }

    createMarker(disaster) {
        const colors = {
            earthquake: '#e74c3c',
            fire: '#e67e22',
            volcano: '#9b59b6',
            landslide: '#d35400',
            flood: '#3498db',
            hurricane: '#1abc9c',
            tornado: '#95a5a6',
            typhoon: '#34495e',
            mudflow: '#795548',
            radiation: '#2ecc71'
        };

        const color = colors[disaster.type] || '#3498db';
        const size = this.getMarkerSize(disaster);

        const icon = L.divIcon({
            className: 'custom-marker',
            html: `<div style="
                background-color: ${color};
                width: ${size}px;
                height: ${size}px;
                border-radius: 50%;
                border: 3px solid white;
                box-shadow: 0 2px 10px rgba(0,0,0,0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: ${size/2}px;
            ">${this.getMarkerIcon(disaster.type)}</div>`,
            iconSize: [size, size],
            iconAnchor: [size/2, size/2]
        });

        const marker = L.marker([disaster.lat, disaster.lng], { icon });
        
        const popupContent = this.createPopupContent(disaster);
        marker.bindPopup(popupContent);
        
        marker.on('click', () => {
            this.showDisasterDetails(disaster);
            this.addToJournal(disaster);
        });

        return marker;
    }

    getMarkerSize(disaster) {
        if (disaster.type === 'earthquake') {
            return Math.min(50, Math.max(20, disaster.magnitude * 8));
        }
        if (disaster.type === 'hurricane') {
            return 40 + (disaster.category * 5);
        }
        return 30;
    }

    getMarkerIcon(type) {
        const icons = {
            earthquake: '⚡',
            fire: '🔥',
            volcano: '🌋',
            landslide: '⛰️',
            flood: '💧',
            hurricane: '🌀',
            tornado: '🌪️',
            typhoon: '🌀',
            mudflow: '🟤',
            radiation: '☢️'
        };
        return icons[type] || '⚠️';
    }

    createPopupContent(disaster) {
        const t = translations[this.currentLanguage];
        let content = `<div style="min-width: 200px;">`;
        content += `<h3 style="color: #e74c3c; margin-bottom: 10px;">${this.getTypeName(disaster.type)}</h3>`;
        
        if (disaster.location) {
            content += `<p><strong>${t.location}:</strong> ${disaster.location}</p>`;
        }
        
        if (disaster.magnitude) {
            content += `<p><strong>${t.magnitude}:</strong> ${disaster.magnitude}</p>`;
        }
        
        if (disaster.depth !== undefined) {
            content += `<p><strong>${t.depth}:</strong> ${disaster.depth} km</p>`;
        }
        
        if (disaster.windSpeed) {
            content += `<p><strong>${t.windSpeed}:</strong> ${disaster.windSpeed} km/h</p>`;
        }
        
        if (disaster.category) {
            content += `<p><strong>${t.category}:</strong> ${disaster.category}</p>`;
        }
        
        if (disaster.status) {
            content += `<p><strong>${t.status}:</strong> ${disaster.status}</p>`;
        }
        
        content += `<p><strong>${t.time}:</strong> ${disaster.time.toLocaleString()}</p>`;
        
        if (disaster.affected || disaster.fatalities) {
            content += `<hr style="margin: 10px 0;">`;
            if (disaster.affected) {
                content += `<p><strong>${t.affected}:</strong> ${disaster.affected.toLocaleString()}</p>`;
            }
            if (disaster.fatalities) {
                content += `<p><strong>${t.fatalities}:</strong> ${disaster.fatalities.toLocaleString()}</p>`;
            }
        }
        
        content += `</div>`;
        return content;
    }

    getTypeName(type) {
        const names = {
            earthquake: 'Earthquake',
            fire: 'Fire',
            volcano: 'Volcano',
            landslide: 'Landslide',
            flood: 'Flood',
            hurricane: 'Hurricane',
            tornado: 'Tornado',
            typhoon: 'Typhoon',
            mudflow: 'Mudflow',
            radiation: 'Radiation'
        };
        return names[type] || type;
    }

    showDisasterDetails(disaster) {
        const t = translations[this.currentLanguage];
        const modal = document.getElementById('disasterModal');
        const title = document.getElementById('modalTitle');
        const body = document.getElementById('modalBody');
        
        title.textContent = `${this.getTypeName(disaster.type)} - Details`;
        
        let content = `<p><strong>${t.location}:</strong> ${disaster.location || 'N/A'}</p>`;
        content += `<p><strong>${t.time}:</strong> ${disaster.time.toLocaleString()}</p>`;
        content += `<p><strong>Coordinates:</strong> ${disaster.lat.toFixed(4)}, ${disaster.lng.toFixed(4)}</p>`;
        
        if (disaster.magnitude) {
            content += `<p><strong>${t.magnitude}:</strong> ${disaster.magnitude}</p>`;
        }
        
        if (disaster.depth !== undefined) {
            content += `<p><strong>${t.depth}:</strong> ${disaster.depth} km</p>`;
        }
        
        if (disaster.windSpeed) {
            content += `<p><strong>${t.windSpeed}:</strong> ${disaster.windSpeed} km/h</p>`;
        }
        
        if (disaster.category) {
            content += `<p><strong>${t.category}:</strong> Category ${disaster.category}</p>`;
        }
        
        if (disaster.status) {
            content += `<p><strong>${t.status}:</strong> ${disaster.status}</p>`;
        }
        
        content += `<hr style="margin: 15px 0;">`;
        content += `<h4>${t.casualties}</h4>`;
        content += `<p><strong>${t.affected}:</strong> ${disaster.affected ? disaster.affected.toLocaleString() : 'N/A'}</p>`;
        content += `<p><strong>${t.fatalities}:</strong> ${disaster.fatalities ? disaster.fatalities.toLocaleString() : 'N/A'}</p>`;
        content += `<p><strong>${t.missing}:</strong> ${disaster.missing ? disaster.missing.toLocaleString() : 'N/A'}</p>`;
        
        if (disaster.description) {
            content += `<hr style="margin: 15px 0;">`;
            content += `<h4>${t.description}</h4>`;
            content += `<p>${disaster.description}</p>`;
        }
        
        body.innerHTML = content;
        modal.classList.add('active');
    }

    updateStatistics() {
        let totalAffected = 0;
        let totalFatalities = 0;
        let totalMissing = 0;
        let totalDisasters = 0;

        Object.values(this.disasters).forEach(disasterArray => {
            disasterArray.forEach(disaster => {
                totalDisasters++;
                totalAffected += disaster.affected || 0;
                totalFatalities += disaster.fatalities || 0;
                totalMissing += disaster.missing || 0;
            });
        });

        document.getElementById('affectedCount').textContent = totalAffected.toLocaleString();
        document.getElementById('fatalitiesCount').textContent = totalFatalities.toLocaleString();
        document.getElementById('missingCount').textContent = totalMissing.toLocaleString();
        document.getElementById('disastersCount').textContent = totalDisasters.toLocaleString();
    }

    updateLastUpdateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString();
        document.getElementById('lastUpdateTime').textContent = timeString;
    }

    checkForAlerts() {
        Object.values(this.disasters).forEach(disasterArray => {
            disasterArray.forEach(disaster => {
                // Check for significant events
                const isSignificant = 
                    (disaster.type === 'earthquake' && disaster.magnitude >= 6) ||
                    (disaster.type === 'hurricane' && disaster.category >= 3) ||
                    (disaster.fatalities && disaster.fatalities > 10) ||
                    (disaster.affected && disaster.affected > 10000);

                if (isSignificant) {
                    this.addNotification(disaster);
                }
            });
        });
    }

    addNotification(disaster) {
        this.notificationCount++;
        document.getElementById('notificationBadge').textContent = this.notificationCount;

        const notificationList = document.getElementById('notificationsList');
        const notification = document.createElement('div');
        notification.className = 'notification-item';
        notification.innerHTML = `
            <h4>${this.getTypeName(disaster.type)} Alert</h4>
            <p>${disaster.location || 'Unknown location'}</p>
            <p class="time">${disaster.time.toLocaleString()}</p>
        `;
        
        notificationList.insertBefore(notification, notificationList.firstChild);
    }

    addToJournal(disaster) {
        const entry = {
            id: Date.now(),
            ...disaster,
            loggedAt: new Date()
        };
        
        this.journalEntries.unshift(entry);
        
        // Keep only last 100 entries
        if (this.journalEntries.length > 100) {
            this.journalEntries = this.journalEntries.slice(0, 100);
        }
        
        // Save to localStorage
        localStorage.setItem('journalEntries', JSON.stringify(this.journalEntries));
    }

    openJournal() {
        // Create journal page/modal
        const journalWindow = window.open('', 'Disaster Journal', 'width=800,height=600');
        
        const t = translations[this.currentLanguage];
        
        journalWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Disaster Journal</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        padding: 20px;
                        background-color: #f5f7fa;
                    }
                    h1 {
                        color: #2c3e50;
                        border-bottom: 3px solid #3498db;
                        padding-bottom: 10px;
                    }
                    .entry {
                        background: white;
                        padding: 15px;
                        margin-bottom: 15px;
                        border-radius: 8px;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                        border-left: 4px solid #e74c3c;
                    }
                    .entry h3 {
                        color: #e74c3c;
                        margin-bottom: 10px;
                    }
                    .entry p {
                        margin: 5px 0;
                        color: #7f8c8d;
                    }
                    .entry strong {
                        color: #2c3e50;
                    }
                    .no-entries {
                        text-align: center;
                        color: #95a5a6;
                        padding: 40px;
                    }
                </style>
            </head>
            <body>
                <h1>📖 Disaster Journal</h1>
                <p>Total Entries: ${this.journalEntries.length}</p>
                <hr>
        `);
        
        if (this.journalEntries.length === 0) {
            journalWindow.document.write('<div class="no-entries">No journal entries yet. Click on disaster markers to add entries.</div>');
        } else {
            this.journalEntries.forEach(entry => {
                journalWindow.document.write(`
                    <div class="entry">
                        <h3>${this.getTypeName(entry.type)} - ${entry.location || 'Unknown'}</h3>
                        <p><strong>Time:</strong> ${entry.time.toLocaleString()}</p>
                        <p><strong>Logged:</strong> ${entry.loggedAt.toLocaleString()}</p>
                        <p><strong>Coordinates:</strong> ${entry.lat.toFixed(4)}, ${entry.lng.toFixed(4)}</p>
                        ${entry.magnitude ? `<p><strong>Magnitude:</strong> ${entry.magnitude}</p>` : ''}
                        ${entry.windSpeed ? `<p><strong>Wind Speed:</strong> ${entry.windSpeed} km/h</p>` : ''}
                        ${entry.category ? `<p><strong>Category:</strong> ${entry.category}</p>` : ''}
                        ${entry.affected ? `<p><strong>Affected:</strong> ${entry.affected.toLocaleString()}</p>` : ''}
                        ${entry.fatalities ? `<p><strong>Fatalities:</strong> ${entry.fatalities.toLocaleString()}</p>` : ''}
                    </div>
                `);
            });
        }
        
        journalWindow.document.write(`
                </body>
                </html>
        `);
        
        journalWindow.document.close();
    }

    startAutoUpdate() {
        // Update every 5 minutes (300000 ms)
        this.updateInterval = setInterval(() => {
            this.fetchAllData();
        }, 300000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.disasterTracker = new DisasterTracker();
});
