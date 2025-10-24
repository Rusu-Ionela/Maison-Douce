const fs = require('fs');
const path = require('path');

router.post('/imagine', async (req, res) => {
    const { imagine, numeClient } = req.body;

    const base64Data = imagine.replace(/^data:image\/png;base64,/, '');
    const fileName = `tort_${Date.now()}.png`;
    const filePath = path.join(__dirname, '../imagini_salvate', fileName);

    fs.writeFile(filePath, base64Data, 'base64', function (err) {
        if (err) {
            console.error('Eroare la salvare:', err);
            return res.status(500).json({ eroare: 'Nu s-a putut salva imaginea' });
        }
        res.json({ mesaj: 'Imagine salvată cu succes', nume: fileName });
    });
});
