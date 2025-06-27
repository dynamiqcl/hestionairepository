# Hestion AI - Receipt Management Platform

## Overview
Hestion AI is an intelligent receipt management platform designed to simplify financial management for businesses and professionals. The system uses artificial intelligence to process receipts via PDF uploads or photos, automatically extracting key information and categorizing expenses.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite
- **UI Components**: Radix UI with shadcn/ui design system
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Authentication**: Session-based authentication with Passport.js

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM
- **Authentication**: Passport.js with local strategy
- **File Upload**: Multer with local file storage
- **AI Processing**: OpenAI GPT-4 Vision API for receipt analysis

## Key Components

### Authentication System
- Role-based access control (CLIENTE, ADMINISTRADOR, EMPLEADO)
- Session-based authentication with memory store
- Password hashing using Node.js crypto module
- User management with comprehensive profile information

### Receipt Processing Pipeline
1. **File Upload**: Supports images (JPG, PNG) and PDF files
2. **OCR Processing**: Uses Tesseract.js for client-side text extraction
3. **AI Analysis**: OpenAI GPT-4 Vision API for intelligent data extraction
4. **Validation**: Multi-step validation for receipt authenticity
5. **Categorization**: Automatic expense categorization with confidence scoring

### Database Schema
- **Users**: Complete user profiles with company information
- **Receipts**: Receipt data with extracted information and metadata
- **Categories**: Expense categories with hierarchical support
- **Companies**: Multi-company support for enterprise users
- **Documents**: Document management system
- **User Messages**: Internal messaging system

### File Storage
- Local file system storage with organized directory structure
- Secure file serving with authentication checks
- Support for receipts, documents, and temporary files
- Automatic directory creation and management

## Data Flow

1. **User Authentication**: Login via email/password → Session creation → Role-based access
2. **Receipt Upload**: File selection → Client-side preview → Server upload → Storage
3. **AI Processing**: File analysis → OpenAI API call → Data extraction → Validation
4. **Data Management**: User review → Manual corrections → Database storage
5. **Reporting**: Data aggregation → Chart generation → Export functionality

## External Dependencies

### Core Dependencies
- **@tensorflow/tfjs**: Machine learning capabilities for image processing
- **tesseract.js**: OCR processing for text extraction
- **openai**: GPT-4 Vision API integration
- **multer**: File upload handling
- **drizzle-orm**: Type-safe database operations

### UI/UX Dependencies
- **@radix-ui/***: Accessible UI components
- **@tanstack/react-query**: Server state management
- **recharts**: Data visualization and charting
- **tailwindcss**: Utility-first CSS framework

### Development Dependencies
- **vite**: Fast build tool and dev server
- **typescript**: Type safety and developer experience
- **esbuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Development Environment
- **Dev Server**: Vite development server with HMR
- **Database**: PostgreSQL with Drizzle migrations
- **File Storage**: Local filesystem in `uploads/` directory

### Production Build
- **Frontend**: Vite build to `dist/public`
- **Backend**: esbuild bundle to `dist/index.js`
- **Database**: PostgreSQL with connection pooling
- **Environment**: NODE_ENV=production

### Database Management
- **Migrations**: Drizzle Kit for schema management
- **Connection**: Neon serverless PostgreSQL
- **Schema**: Type-safe with Zod validation

## Changelog
- June 27, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.