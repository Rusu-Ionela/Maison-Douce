// controllers/chatController.js
let istoricChat = []; // Temporar în memorie. Poți conecta la MongoDB mai târziu.

exports.sendMessage = (req, res) => {
    const mesaj = req.body;
    istoricChat.push(mesaj);
    res.status(201).json({ mesaj: 'Mesaj salvat cu succes!' });
};

exports.getMessages = (req, res) => {
    res.json(istoricChat);
};
