import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authConfigured } from '../config/env.js';

const router = Router();
const registration = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(10).max(128),
  role: z.enum(['PATIENT', 'FAMILY', 'CARETAKER']).default('PATIENT'),
});
const login = z.object({
  email: z.string().trim().email().transform(value => value.toLowerCase()),
  password: z.string().min(1).max(128),
});
const sessionToken = user => jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '8h' });

router.post('/register', async (req, res, next) => {
  const parsed = registration.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a name, valid email, and password with at least 10 characters.' });
  if (!authConfigured()) return res.status(503).json({ error: 'Real registration is unavailable. Configure DATABASE_URL and a private JWT_SECRET in server/.env; Explore Demo remains available.' });
  try {
    const input = parsed.data;
    const user = await prisma.user.create({
      data: {
        ...input,
        passwordHash: await bcrypt.hash(input.password, 12),
        patient: input.role === 'PATIENT' ? { create: {} } : undefined,
      },
      include: { patient: { select: { id: true } } },
    });
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, patientId: user.patient?.id || null };
    res.status(201).json({ user: safeUser, token: sessionToken(safeUser) });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ error: 'An account with that email already exists.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  const parsed = login.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' });
  if (!authConfigured()) return res.status(503).json({ error: 'Real sign-in is unavailable. Configure DATABASE_URL and a private JWT_SECRET in server/.env; Explore Demo remains available.' });
  try {
    const input = parsed.data;
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Email or password is incorrect.' });
    }
    const profile = user.role === 'PATIENT'
      ? await prisma.patientProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
      : null;
    const safeUser = { id: user.id, name: user.name, email: user.email, role: user.role, patientId: profile?.id || null };
    res.json({ user: safeUser, token: sessionToken(safeUser) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', async (req, res) => {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) return res.status(503).json({ error: 'Authentication is not configured.' });
    const header = req.headers.authorization || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required.' });
    const claims = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: claims.id }, include: { patient: { select: { id: true } } } });
    if (!user) return res.status(401).json({ error: 'Session user no longer exists.' });
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, patientId: user.patient?.id || null } });
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
});

export default router;
