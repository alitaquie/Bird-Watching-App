"use strict";

// This will be the object that will contain the Vue attributes
// and be used to initialize it.
let app = {};

// Initialize Vue app data
app.data = function() {
  return {
    // Initial data
    species_dates: {},
    sortedSpeciesDates: null,
    searchTerm: "",
    isVisible: {},
    sightings_count: {},
    sortOrder: "" // To keep track of the selected sort order
  };
};

// Define Vue app methods
app.methods = {
  toggleVisibility(species) {
    this.isVisible[species] = !this.isVisible[species];
    if (this.isVisible[species]) {
      this.$nextTick(() => {
        this.initializeMap(species);
      });
    }
  },
  renderChart(labels, data) {
    var ctx = document.getElementById('sightingsChart').getContext('2d');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Sightings Count',
          data: data,
          backgroundColor: 'rgba(255, 99, 132, 0.2)', // Red color with 20% opacity
          borderColor: 'rgba(255, 99, 132, 1)', // Red color
          borderWidth: 1
      }]
      },
      options: {
        maintainAspectRatio: false, // Disable aspect ratio
        responsive: true, // Make the chart responsive
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Number of Sightings',
                    padding: {
                        top: 20 // Adjust the top padding as needed
                    }
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Dates Observed'
                }
            }
        },
        width: 800,
        height: 600,
        plugins: {
            legend: {
                display: false // Hide legend
            }
        }
    }
    
    });
  },  
  sortSightings() {
    const order = this.sortOrder;
    // Close all cards
    this.isVisible = {};
    if (!order) {
      this.sortedSpeciesDates = null;
    } else {
      this.sortedSpeciesDates = Object.fromEntries(
        Object.entries(this.species_dates).sort(([, datesA], [, datesB]) => {
          const dateA = new Date(datesA[0].date);
          const dateB = new Date(datesB[0].date);
          return order === 'earliest' ? dateA - dateB : dateB - dateA;
        })
      );
    }
  },
  
  
  initializeMap(speciesIndex) {
    const dates = this.species_dates[Object.keys(this.species_dates)[speciesIndex]];
    const mapId = 'map-' + speciesIndex;
    const map = L.map(mapId).setView([0, 0], 2); // Set initial view

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    dates.forEach(sighting => {
      const lat = sighting.latitude;
      const lon = sighting.longitude;
      L.marker([lat, lon]).addTo(map);
    });

    if (dates.length > 0) {
      const latLngBounds = dates.map(sighting => [sighting.latitude, sighting.longitude]);
      map.fitBounds(latLngBounds);
    }
  }
};

// Define Vue computed properties
app.computed = {
  filteredSpeciesDates() {
    const speciesDatesToUse = this.sortedSpeciesDates || this.species_dates;
    // Filter species based on the search term
    if (!this.searchTerm) {
      return speciesDatesToUse;
    }
    const term = this.searchTerm.toLowerCase();
    return Object.fromEntries(
      Object.entries(speciesDatesToUse).filter(([species, dates]) =>
        species.toLowerCase().includes(term)
      )
    );
  }
};

// Create and mount the Vue app
app.vue = Vue.createApp({
  data: app.data,
  methods: app.methods,
  computed: app.computed,
  watch: {
    // Watch for changes in sortOrder and close all cards when it changes
    sortOrder: {
      handler(newValue, oldValue) {
        // Close all cards
        this.isVisible = {};
      },
      immediate: true // Trigger the handler immediately when sortOrder changes
    }
  }
}).mount("#app");

// Function to load data from the backend
app.load_data = function() {
  axios.get(get_user_statistics_url)
    .then(function(response) {
      app.vue.species_dates = response.data.species_dates;
      app.vue.sightings_count = response.data.sightings_count;
      // Prepare data for Chart.js
      let labels = Object.keys(response.data.sightings_count);
      let data = Object.values(response.data.sightings_count);

      // Initialize isVisible to be false for all species
      app.vue.isVisible = Object.keys(response.data.species_dates).reduce((acc, key, index) => {
        acc[index] = false;
        return acc;
      }, {});

      // Render the chart
      app.vue.renderChart(labels, data);
    }.bind(this)) // bind(this) ensures that 'this' refers to the Vue instance
    .catch(function(error) {
      console.error("Error loading data:", error);
    });
};

// Load data when the app is ready
app.load_data();
