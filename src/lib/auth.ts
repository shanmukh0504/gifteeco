import jwt from 'jsonwebtoken';
import User from '@/models/User';
import connectDB from './db';

export async function auth(req: Request) {
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return null;

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    await connectDB();
    
    const user = await User.findById(decoded.userId);
    if (!user) return null;

    return user;
  } catch (error) {
    console.error(error); 
    return null;
  }
}