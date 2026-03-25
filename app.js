const { Sequelize, DataTypes } = require('sequelize');

// Konfiguracja połączenia
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
});

// Model Sali Konferencyjnej
const ConferenceRoom = sequelize.define('ConferenceRoom', {
  name: { type: DataTypes.STRING, unique: true, allowNull: false },
  capacity: { type: DataTypes.INTEGER, allowNull: false },
  hasProjector: { type: DataTypes.BOOLEAN, defaultValue: false },
  floor: { type: DataTypes.INTEGER, allowNull: false }
});

// Model Biurka
const Desk = sequelize.define('Desk', {
  identifier: { type: DataTypes.STRING, unique: true, allowNull: false },
  equipment: { type: DataTypes.STRING },
  isStandingDesk: { type: DataTypes.BOOLEAN, defaultValue: false }
});

// Model Rezerwacji
const Reservation = sequelize.define('Reservation', {
  employeeName: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATEONLY, allowNull: false },
  startTime: { type: DataTypes.TIME, allowNull: false },
  endTime: { type: DataTypes.TIME, allowNull: false },
  resourceType: { type: DataTypes.ENUM('room', 'desk'), allowNull: false },
  resourceId: { type: DataTypes.INTEGER, allowNull: false }
});

// Eksportujemy modele i obiekt połączenia
module.exports = { sequelize, ConferenceRoom, Desk, Reservation };