const express = require('express');
const path = require('path');
const { sequelize, ConferenceRoom, Desk, Reservation } = require('./models');

const app = express();
const PORT = 3000;

// --- KONFIGURACJA ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- DANE TESTOWE (SEED) ---
// Ta funkcja doda przykładowe dane, jeśli baza jest pusta
async function seedDatabase() {
    const roomsCount = await ConferenceRoom.count();
    const desksCount = await Desk.count();

    if (roomsCount === 0 && desksCount === 0) {
        console.log('Baza jest pusta. Generowanie danych testowych...');
        
        await ConferenceRoom.bulkCreate([
            { name: 'Sala Oceaniczna', capacity: 12, hasProjector: true, floor: 1 },
            { name: 'Sala Górska', capacity: 4, hasProjector: false, floor: 2 }
        ]);

        await Desk.bulkCreate([
            { identifier: 'B-01', equipment: 'Monitor 27", Stacja dokująca', isStandingDesk: true },
            { identifier: 'B-02', equipment: 'Monitor 24"', isStandingDesk: false }
        ]);
        
        console.log('Dane testowe zostały dodane.');
    }
}

// --- ENDPOINTY (Zgodnie ze specyfikacją) ---

// GET /index.html - Strona główna z listą zasobów
app.get(['/', '/index.html'], async (req, res) => {
    try {
        const rooms = await ConferenceRoom.findAll();
        const desks = await Desk.findAll();
        res.render('index', { rooms, desks });
    } catch (error) {
        console.error(error);
        res.status(500).send("Błąd serwera podczas pobierania zasobów.");
    }
});

// GET /details.html - Szczegóły zasobu i jego rezerwacje
app.get('/details.html', async (req, res) => {
    const { type, id } = req.query;
    try {
        let resource;
        if (type === 'room') {
            resource = await ConferenceRoom.findByPk(id);
        } else if (type === 'desk') {
            resource = await Desk.findByPk(id);
        }

        if (!resource) {
            return res.status(404).send("Nie znaleziono zasobu.");
        }

        const reservations = await Reservation.findAll({
            where: { resourceType: type, resourceId: id },
            order: [['date', 'ASC'], ['startTime', 'ASC']]
        });

        res.render('details', { resource, type, reservations });
    } catch (error) {
        res.status(500).send("Błąd podczas pobierania szczegółów.");
    }
});

// --- START SERWERA ---
sequelize.sync({ force: false }).then(async () => {
    await seedDatabase();
    app.listen(PORT, () => {
        console.log(`--- OfficeSpace System ---`);
        console.log(`Serwer działa pod adresem: http://localhost:${PORT}`);
        console.log(`Naciśnij Ctrl+C, aby zatrzymać.`);
    });
}).catch(err => {
    console.error('Nie udało się połączyć z bazą danych:', err);
});