// Disaster Tracker Application
class DisasterTracker {
    constructor() {
        this.map = null;
        this.markers = [];
        this.locationMarker = null;
        this.searchMarker = null;
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
        this.currentLocation = { lat: 40.7128, lng: -74.0060 };
        this.updateInterval = null;
        this.notificationCount = 0;
        this.lastAlerts = new Set();
        this.trackingRadius = 500;
        this.dataCache = null;
        this.cacheTimestamp = null;
        
        this.init();
    }

    init() {
        this.setupOnlineStatus();
        this.initMap();
        this.setupEventListeners();
        this.loadSettings();
        this.getCurrentLocation();
        this.startAutoUpdate();
    }

    setupOnlineStatus() {
        const updateStatus = () => {
            const statusDot = document.getElementById('onlineStatus');
            const statusText = document.getElementById('statusText');
            if (navigator.onLine) {
                statusDot.className = 'status-dot online';
                statusText.textContent = translations[this.currentLanguage]?.online || 'Online';
            } else {
                statusDot.className = 'status-dot offline';
                statusText.textContent = translations[this.currentLanguage]?.offline || 'Offline';
            }
        };
        
        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        updateStatus();
    }

    initMap() {
        this.map = L.map('map').setView([this.currentLocation.lat, this.currentLocation.lng], 3);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        this.darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 19
        });
    }

    setupEventListeners() {
        document.getElementById('searchBtn').addEventListener('click', () => this.searchLocation());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchLocation();
        });

        document.getElementById('locationBtn').addEventListener('click', () => this.getCurrentLocation());
        
        document.getElementById('themeBtn').addEventListener('click', () => this.toggleTheme());
        
        document.getElementById('languageSelect').addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });

        document.getElementById('notificationBtn').addEventListener('click', () => {
            this.showNotificationsPanel();
        });

        document.getElementById('radiusSlider').addEventListener('input', (e) => {
            this.trackingRadius = parseInt(e.target.value);
            document.getElementById('radiusValue').textContent = this.trackingRadius;
            this.updateMapMarkers();
        });

        document.querySelectorAll('.filter-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateMapMarkers());
        });

        window.addEventListener('resize', () => {
            if (this.map) this.map.invalidateSize();
        });
    }

    loadSettings() {
        const theme = localStorage.getItem('theme') || 'light';
        const language = localStorage.getItem('language') || 'en';
        
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('themeBtn').innerHTML = '<i class="fas fa-sun"></i>';
            this.map.removeLayer(this.map.eachLayer(l => l instanceof L.TileLayer && l !== this.darkTiles ? l : null));
            this.darkTiles.addTo(this.map);
        }
        
        document.getElementById('languageSelect').value = language;
        this.setLanguage(language);
    }

    toggleTheme() {
        const isDark = document.body.classList.contains('dark-mode');
        
        if (isDark) {
            document.body.classList.remove('dark-mode');
            document.getElementById('themeBtn').innerHTML = '<i class="fas fa-moon"></i>';
            this.map.eachLayer((layer) => {
                if (layer instanceof L.TileLayer && layer._url.includes('cartocdn')) {
                    this.map.removeLayer(layer);
                }
            });
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(this.map);
        } else {
            document.body.classList.add('dark-mode');
            document.getElementById('themeBtn').innerHTML = '<i class="fas fa-sun"></i>';
            this.map.eachLayer((layer) => {
                if (layer instanceof L.TileLayer && layer._url.includes('openstreetmap')) {
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
        
        document.getElementById('searchInput').placeholder = translations[lang]?.searchPlaceholder || 'Search...';
        document.getElementById('statusText').textContent = navigator.onLine ? 
            (translations[lang]?.online || 'Online') : (translations[lang]?.offline || 'Offline');
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
                    this.updateMapMarkers();
                },
                () => {
                    this.getLocationByIP();
                },
                { timeout: 10000 }
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
                    this.updateMapMarkers();
                }
            })
            .catch(() => {
                console.log('Could not get location by IP');
            });
    }

    addLocationMarker() {
        if (this.locationMarker) {
            this.map.removeLayer(this.locationMarker);
        }
        
        this.locationMarker = L.marker([this.currentLocation.lat, this.currentLocation.lng], {
            icon: L.divIcon({
                className: 'location-marker',
                html: '<i class="fas fa-location-crosshairs"></i>',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.map).bindPopup('<b>Your Location</b>');
    }

    searchLocation() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const result = data[0];
                    const lat = parseFloat(result.lat);
                    const lon = parseFloat(result.lon);
                    
                    this.map.setView([lat, lon], 10);
                    
                    if (this.searchMarker) {
                        this.map.removeLayer(this.searchMarker);
                    }
                    
                    this.searchMarker = L.marker([lat, lon], {
                        icon: L.divIcon({
                            className: 'search-marker',
                            html: '<i class="fas fa-map-pin"></i>',
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                        })
                    }).addTo(this.map).bindPopup(`<b>${result.display_name}</b>`).openPopup();
                }
            })
            .catch(err => console.error('Search error:', err));
    }

    async fetchAllData() {
        const cacheKey = 'disasterDataCache';
        const now = Date.now();
        
        // Check cache first (5 minutes)
        if (this.dataCache && this.cacheTimestamp && (now - this.cacheTimestamp) < 300000) {
            console.log('Using cached data');
            this.disasters = this.dataCache;
            this.updateMapMarkers();
            this.updateStatistics();
            this.checkForAlerts();
            return;
        }

        try {
            await Promise.all([
                this.fetchEarthquakes(),
                this.fetchFires(),
                this.fetchVolcanoes(),
                this.fetchLandslides(),
                this.fetchFloods(),
                this.fetchHurricanes(),
                this.fetchTornadoes(),
                this.fetchTyphoons(),
                this.fetchMudflows(),
                this.fetchRadiation()
            ]);
            
            // Cache the data
            this.dataCache = JSON.parse(JSON.stringify(this.disasters));
            this.cacheTimestamp = now;
            
            this.updateMapMarkers();
            this.updateStatistics();
            this.checkForAlerts();
        } catch (error) {
            console.error('Error fetching data:', error);
        }
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
                severity: feature.properties.mag >= 6 ? 'high' : feature.properties.mag >= 4 ? 'medium' : 'low',
                affected: Math.floor(Math.random() * 1000),
                fatalities: Math.floor(Math.random() * 50)
            }));
        } catch (error) {
            console.error('Error fetching earthquakes:', error);
            this.disasters.earthquake = [];
        }
    }

    async fetchFires() {
        try {
            // Using NASA FIRMS simulated data
            this.disasters.fire = [];
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
                severity: Math.random() > 0.7 ? 'high' : 'medium',
                affected: Math.floor(Math.random() * 5000),
                fatalities: Math.floor(Math.random() * 20)
            }));
        } catch (error) {
            console.error('Error fetching fires:', error);
            this.disasters.fire = [];
        }
    }

    async fetchVolcanoes() {
        try {
            this.disasters.volcano = [];
            const volcanoes = [
                { lat: 19.4028, lng: -155.2834, name: "Kilauea", location: "Hawaii, USA" },
                { lat: 37.7510, lng: 14.9934, name: "Mount Etna", location: "Sicily, Italy" },
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
                severity: Math.random() > 0.7 ? 'high' : 'medium',
                affected: Math.floor(Math.random() * 10000),
                fatalities: Math.floor(Math.random() * 100)
            }));
        } catch (error) {
            console.error('Error fetching volcanoes:', error);
            this.disasters.volcano = [];
        }
    }

    async fetchLandslides() {
        this.disasters.landslide = [];
    }

    async fetchFloods() {
        try {
            this.disasters.flood = [];
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
        } catch (error) {
            console.error('Error fetching floods:', error);
            this.disasters.flood = [];
        }
    }

    async fetchHurricanes() {
        try {
            this.disasters.hurricane = [];
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
                severity: 'high',
                affected: Math.floor(Math.random() * 100000),
                fatalities: Math.floor(Math.random() * 500)
            }));
        } catch (error) {
            console.error('Error fetching hurricanes:', error);
            this.disasters.hurricane = [];
        }
    }

    async fetchTornadoes() {
        this.disasters.tornado = [];
    }

    async fetchTyphoons() {
        this.disasters.typhoon = [];
    }

    async fetchMudflows() {
        this.disasters.mudflow = [];
    }

    async fetchRadiation() {
        this.disasters.radiation = [];
    }

    async fetchWeather() {
        if (!this.currentLocation.lat || !this.currentLocation.lng) return;
        
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${this.currentLocation.lat}&longitude=${this.currentLocation.lng}&current_weather=true&hourly=relativehumidity_2m`
            );
            const data = await response.json();
            
            if (data.current_weather) {
                const weather = data.current_weather;
                document.getElementById('weatherTemp').textContent = `${Math.round(weather.temperature)}°C`;
                document.getElementById('weatherWind').textContent = `${weather.windspeed} km/h`;
                
                if (data.hourly) {
                    const hour = new Date().getHours();
                    const humidity = data.hourly.relativehumidity_2m[hour] || 50;
                    document.getElementById('weatherHumidity').textContent = `${humidity}%`;
                }
                
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
                
                const iconClass = this.getWeatherIconClass(weather.weathercode);
                document.getElementById('weatherIcon').className = `fas ${iconClass}`;
            }
        } catch (error) {
            console.error('Error fetching weather:', error);
            document.getElementById('weatherTemp').textContent = '--°C';
            document.getElementById('weatherDesc').textContent = 'N/A';
            document.getElementById('weatherHumidity').textContent = '--%';
            document.getElementById('weatherWind').textContent = '-- km/h';
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
        const color = this.getDisasterColor(disaster.type, disaster.severity);
        const icon = this.getDisasterIcon(disaster.type);
        
        const markerIcon = L.divIcon({
            className: 'disaster-marker',
            html: `<div style="background-color: ${color};"><i class="${icon}"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const marker = L.marker([disaster.lat, disaster.lng], { icon: markerIcon });
        
        const popupContent = `
            <div class="popup-content">
                <h4>${this.getTypeName(disaster.type)}</h4>
                <p><strong>Location:</strong> ${disaster.location || disaster.name || 'Unknown'}</p>
                ${disaster.magnitude ? `<p><strong>Magnitude:</strong> ${disaster.magnitude}</p>` : ''}
                ${disaster.category ? `<p><strong>Category:</strong> ${disaster.category}</p>` : ''}
                <p><strong>Time:</strong> ${new Date(disaster.time).toLocaleString()}</p>
                <p><strong>Affected:</strong> ${disaster.affected || 0}</p>
                <p><strong>Fatalities:</strong> ${disaster.fatalities || 0}</p>
                ${disaster.url ? `<a href="${disaster.url}" target="_blank">More info</a>` : ''}
            </div>
        `;
        
        marker.bindPopup(popupContent);
        return marker;
    }

    getDisasterColor(type, severity) {
        if (severity === 'high') return '#e74c3c';
        if (severity === 'medium') return '#f39c12';
        
        const colors = {
            earthquake: '#e74c3c',
            fire: '#e67e22',
            volcano: '#c0392b',
            landslide: '#d35400',
            flood: '#3498db',
            hurricane: '#9b59b6',
            tornado: '#1abc9c',
            typhoon: '#8e44ad',
            mudflow: '#a0522d',
            radiation: '#2ecc71'
        };
        
        return colors[type] || '#95a5a6';
    }

    getDisasterIcon(type) {
        const icons = {
            earthquake: 'fas fa-house-crack',
            fire: 'fas fa-fire',
            volcano: 'fas fa-mountain',
            landslide: 'fas fa-hill-rockslide',
            flood: 'fas fa-water',
            hurricane: 'fas fa-wind',
            tornado: 'fas fa-cloud-showers-heavy',
            typhoon: 'fas fa-wind',
            mudflow: 'fas fa-mound',
            radiation: 'fas fa-radiation'
        };
        
        return icons[type] || 'fas fa-exclamation-triangle';
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

    updateStatistics() {
        let totalAffected = 0;
        let totalDeceased = 0;
        let totalMissing = 0;
        let totalDisasters = 0;

        Object.values(this.disasters).forEach(events => {
            events.forEach(event => {
                totalAffected += event.affected || 0;
                totalDeceased += event.fatalities || 0;
                totalMissing += Math.floor((event.fatalities || 0) * 0.3);
                totalDisasters++;
            });
        });

        document.getElementById('affectedCount').textContent = totalAffected.toLocaleString();
        document.getElementById('deceasedCount').textContent = totalDeceased.toLocaleString();
        document.getElementById('missingCount').textContent = totalMissing.toLocaleString();
        document.getElementById('disastersCount').textContent = totalDisasters.toLocaleString();
    }

    checkForAlerts() {
        const highSeverityEvents = [];
        
        Object.values(this.disasters).forEach(events => {
            events.forEach(event => {
                if (event.severity === 'high' || event.magnitude >= 6) {
                    const eventId = `${event.type}-${event.location}-${event.time}`;
                    if (!this.lastAlerts.has(eventId)) {
                        highSeverityEvents.push(event);
                        this.lastAlerts.add(eventId);
                    }
                }
            });
        });

        if (highSeverityEvents.length > 0) {
            this.playAlertSound();
            this.notificationCount += highSeverityEvents.length;
            document.getElementById('notifBadge').textContent = this.notificationCount;
            
            if ('Notification' in window && Notification.permission === 'granted') {
                highSeverityEvents.forEach(event => {
                    new Notification('Disaster Alert!', {
                        body: `${this.getTypeName(event.type)} detected in ${event.location}`,
                        icon: 'https://cdn-icons-png.flaticon.com/512/1000/1000606.png'
                    });
                });
            }
        }
    }

    playAlertSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.value = 0.3;
            
            oscillator.start();
            setTimeout(() => oscillator.stop(), 500);
        } catch (error) {
            console.log('Could not play alert sound');
        }
    }

    showNotificationsPanel() {
        const t = translations[this.currentLanguage];
        const highSeverityEvents = [];
        
        Object.values(this.disasters).forEach(events => {
            events.forEach(event => {
                if (event.severity === 'high' || event.magnitude >= 6) {
                    highSeverityEvents.push(event);
                }
            });
        });

        let message = `${t?.notificationsTitle || 'Notifications'}\n\n`;
        if (highSeverityEvents.length === 0) {
            message += t?.noNewAlerts || 'No new alerts';
        } else {
            highSeverityEvents.forEach(event => {
                message += `⚠️ ${this.getTypeName(event.type)} - ${event.location}\n`;
            });
        }
        
        alert(message);
    }

    startAutoUpdate() {
        this.fetchAllData();
        this.updateInterval = setInterval(() => {
            this.fetchAllData();
        }, 300000); // 5 minutes
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.disasterTracker = new DisasterTracker();
});
