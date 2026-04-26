import express from 'express';
import { submitForm, getMessages, deleteMessage } from '../controller/formcontroller.js';
import { protect } from '../middleware/authmiddleware.js';


const router = express.Router();

router.post('/submit', submitForm);
router.get('/messages', protect, getMessages);
router.delete('/messages/:id', protect, deleteMessage);


export default router;