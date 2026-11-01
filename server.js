const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ==========================================
// MONGODB BAĞLANTI URL'Sİ (Kendi Atlas bağlantınızı buraya yazabilirsiniz)
// ==========================================
const MONGO_URI = 'mongodb+srv://kerimcan:kerim.KE4@cluster0.bhwtbps.mongodb.net/butceyonetimi?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Atlas veritabanı bağlantısı başarılı!"))
    .catch(err => console.error("Bağlantı hatası:", err));

// ==========================================
// 1. MODEL (VERİTABANI ŞEMALARI)
// ==========================================
const kullaniciSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    sifre: { type: String, required: true },
    kayitTarihi: { type: Date, default: Date.now }
});
const KullaniciModel = mongoose.model('Kullanici', kullaniciSchema);

const islemSchema = new mongoose.Schema({
    kullaniciEmail: { type: String, required: true },
    tip: { type: String, enum: ['gelir', 'gider'], required: true },
    kategori: { type: String, required: true },
    tutar: { type: Number, required: true },
    tarih: { type: String, required: true },
    aciklama: { type: String, required: true }
});
const IslemModel = mongoose.model('Islem', islemSchema);

// ==========================================
// 2. SERVICE (İŞ MANTIĞI VE VERİTABANI İŞLEMLERİ)
// ==========================================
class ButeService {
    async kullaniciKaydet(veri) {
        const varMi = await KullaniciModel.findOne({ email: veri.email });
        if (varMi) throw new Error("Bu e-posta adresi zaten kayıtlı!");
        const yeniKullanici = new KullaniciModel(veri);
        return await yeniKullanici.save();
    }

    async kullaniciGiris(email, sifre) {
        const kullanici = await KullaniciModel.findOne({ email, sifre });
        if (!kullanici) throw new Error("Geçersiz e-posta veya şifre!");
        return kullanici;
    }

    async islemleriGetir(email) {
        return await IslemModel.find({ kullaniciEmail: email }).sort({ tarih: -1 });
    }

    async islemEkle(veri) {
        const yeniIslem = new IslemModel(veri);
        return await yeniIslem.save();
    }

    async islemSil(id) {
        return await IslemModel.findByIdAndDelete(id);
    }
}
const butceService = new ButeService();

// ==========================================
// 3. CONTROLLER (İSTEK YÖNLENDİRME VE BAĞLANTI)
// ==========================================
class ButeController {
    getIndex(req, res) {
        res.sendFile(path.join(__dirname, 'index.html'));
    }

    async postKayit(req, res) {
        try {
            const sonuc = await butceService.kullaniciKaydet(req.body);
            res.json({ success: true, message: "Kayıt başarıyla oluşturuldu!", data: sonuc });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    async postGiris(req, res) {
        try {
            const { email, sifre } = req.body;
            const kullanici = await butceService.kullaniciGiris(email, sifre);
            res.json({ success: true, message: "Giriş başarılı!", data: kullanici });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    async getIslemler(req, res) {
        try {
            const { email } = req.query;
            const islemler = await butceService.islemleriGetir(email);
            res.json({ success: true, data: islemler });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    async postIslemEkle(req, res) {
        try {
            const sonuc = await butceService.islemEkle(req.body);
            res.json({ success: true, message: "İşlem başarıyla eklendi!", data: sonuc });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    async deleteIslem(req, res) {
        try {
            const { id } = req.params;
            await butceService.islemSil(id);
            res.json({ success: true, message: "İşlem silindi!" });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }
}
const butceController = new ButeController();

// ==========================================
// 4. ÇALIŞTIRMA / BAŞLATMA (EN AŞAĞIDA)
// ==========================================
app.get('/', (req, res) => butceController.getIndex(req, res));
app.post('/api/kayit', (req, res) => butceController.postKayit(req, res));
app.post('/api/giris', (req, res) => butceController.postGiris(req, res));
app.get('/api/islemler', (req, res) => butceController.getIslemler(req, res));
app.post('/api/islem-ekle', (req, res) => butceController.postIslemEkle(req, res));
app.delete('/api/islem-sil/:id', (req, res) => butceController.deleteIslem(req, res));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor.`);
});
