const { z } = require("zod");

// AUTH SCHEMAS
const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["driver", "passenger"]),
});

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

// RIDE SCHEMAS
const locationSchema = z.object({
    lat: z.number(),
    lng: z.number(),
    address: z.string().optional(),
});

const createRideSchema = z.object({
    startLocation: locationSchema,
    endLocation: locationSchema,
    time: z.string().min(1, "Departure time is required"),
    seats: z.number().int().min(1, "At least 1 seat is required"),
    visibility: z.enum(["organization", "friends"]).optional(),
});

module.exports = {
    registerSchema,
    loginSchema,
    createRideSchema,
};
