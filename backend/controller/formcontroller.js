import Form from '../models/formmodel.js';

export const submitForm = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    const newForm = new Form({
      name,
      email,
      phone,
      message,
    });

    const savedForm = await newForm.save();
    
    res.json({ message: 'Form submitted successfully' });
  } catch (error) {
    console.error('Error saving form data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMessages = async (req, res) => {
  try {
    const messages = await Form.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    await Form.findByIdAndDelete(id);
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ message: 'Server error' });
  }
};