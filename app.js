const express = require('express');
const path = require('path');
// Dodajemy Op do importu, aby móc używać operatorów porównania w bazach danych
const { sequelize, ConferenceRoom, Desk, Reservation, Op } = require('./models');
const app = express();
const PORT = 3001
// --- KONFIGURACJA ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- DANE TESTOWE (SEED) ---
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

// --- ENDPOINTY ---

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

// --- KROK 2: POST /book.html - Logika rezerwacji i walidacja kolizji ---
app.post('/book.html', async (req, res) => {
    const { type, id } = req.query;
    const { employeeName, date, startTime, endTime } = req.body;

    try {
        // --- NOWA WALIDACJA: CZY TERMIN NIE JEST W PRZESZŁOŚCI ---
        const now = new Date();
        const selectedDateTime = new Date(`${date}T${startTime}`);
        if (selectedDateTime < now) {
            throw new Error("Nie można rezerwować zasobów w przeszłości.");
        }
        // 1. Podstawowa walidacja czasu
        if (startTime >= endTime) {
            throw new Error("Godzina zakończenia musi być późniejsza niż godzina rozpoczęcia.");
        }

        // 2. Sprawdzenie kolizji w bazie danych
        // Szukamy rezerwacji tego samego zasobu, w tym samym dniu, 
        // których czas nachodzi na nową rezerwację.
        const overlap = await Reservation.findOne({
            where: {
                resourceType: type,
                resourceId: id,
                date: date,
                [Op.and]: [
                    { startTime: { [Op.lt]: endTime } }, // Start istniejącej przed końcem nowej
                    { endTime: { [Op.gt]: startTime } }  // Koniec istniejącej po starcie nowej
                ]
            }
        });

        if (overlap) {
            throw new Error(`Termin zajęty przez: ${overlap.employeeName} (${overlap.startTime} - ${overlap.endTime})`);
        }

        // 3. Jeśli brak kolizji - tworzymy rezerwację
        await Reservation.create({
            employeeName,
            date,
            startTime,
            endTime,
            resourceType: type,
            resourceId: id
        });

        // Przekierowanie na stronę szczegółów (odświeżenie listy)
        res.redirect(`/details.html?type=${type}&id=${id}`);

    } catch (error) {
        // W przypadku błędu (kolizja lub walidacja), renderujemy stronę ponownie z komunikatem błędu
        let resource;
        if (type === 'room') {
            resource = await ConferenceRoom.findByPk(id);
        } else if (type === 'desk') {
            resource = await Desk.findByPk(id);
        }
        
        const reservations = await Reservation.findAll({
            where: { resourceType: type, resourceId: id },
            order: [['date', 'ASC'], ['startTime', 'ASC']]
        });

        res.render('details', { 
            resource, 
            type, 
            reservations, 
            error: error.message 
        });
    }
});
app.post('/cancel-reservation.html', async (req, res) => {
    const { reservationId, type, resourceId } = req.body;
    
    try {
        // Usuwamy rezerwację o konkretnym ID
        await Reservation.destroy({
            where: { id: reservationId }
        });

        console.log(`Usunięto rezerwację ID: ${reservationId}`);
        
        // Przekierowanie z powrotem na stronę szczegółów tego samego zasobu
        res.redirect(`/details.html?type=${type}&id=${resourceId}`);
    } catch (error) {
        console.error("Błąd podczas usuwania:", error);
        res.status(500).send("Nie udało się usunąć rezerwacji.");
    }
});

// --- START SERWERA ---
sequelize.sync({ force: false })
  .then(async () => {
    await seedDatabase();
    // To wywołanie MUSI być wewnątrz bloku .then()
    app.listen(PORT, () => {
        console.log(`--- OfficeSpace System ---`);
        console.log(`Serwer działa pod adresem: http://localhost:${PORT}`);
        console.log(`Naciśnij Ctrl+C, aby zatrzymać.`);
    });
  })
  .catch(err => {
    console.error('Nie udało się połączyć z bazą danych:', err);
  });