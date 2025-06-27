# Hestion AI - Financial Receipt Management Platform

## Overview
Hestion AI is a comprehensive financial management platform built for the Chilean market, specializing in intelligent receipt processing and document management. The system leverages artificial intelligence to automate receipt digitization, categorization, and financial data extraction from images and PDF documents.

## System Architecture

### Full-Stack Architecture
- **Frontend**: React.js with TypeScript, using Vite as the build tool
- **Backend**: Node.js with Express.js server
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and session-based auth
- **File Storage**: Local file system with organized directory structure
- **AI/ML**: OpenAI GPT-4 Vision API and Tesseract.js for OCR processing

### Technology Stack
- **UI Framework**: React with shadcn/ui components and Radix UI primitives
- **Styling**: Tailwind CSS with custom theme configuration
- **State Management**: TanStack Query for server state management
- **Form Handling**: React Hook Form with Zod validation
- **Charts**: Recharts for data visualization
- **File Processing**: Multer for file uploads, Tesseract.js for OCR

## Key Components

### Authentication & Authorization
- Role-based access control with three user types:
  - CLIENTE (Client): Basic receipt management
  - EMPLEADO (Employee): Extended receipt processing capabilities
  - ADMINISTRADOR (Administrator): Full system access including user and category management
- Session-based authentication with memory store
- Password hashing using Node.js crypto module

### Receipt Processing Pipeline
1. **File Upload**: Multi-format support (JPG, PNG, PDF)
2. **OCR Processing**: Tesseract.js for image text extraction
3. **AI Analysis**: OpenAI GPT-4 Vision for intelligent data extraction
4. **Validation**: Custom validation logic for receipt authenticity
5. **Categorization**: Automatic categorization with manual override options
6. **Storage**: Structured data storage with file system integration

### Database Schema
- **Users**: Complete user profiles with company information
- **Companies**: Multi-company support with user associations
- **Categories**: Configurable expense categories
- **Receipts**: Receipt data with extracted information and metadata
- **Documents**: Document management system for shared files
- **User Messages**: Internal messaging system

### Document Management
- Secure file storage with access control
- Document categorization and metadata
- User-specific document access permissions
- Download and preview capabilities

## Data Flow

### Receipt Upload Flow
1. User uploads receipt image/PDF through web interface
2. File is stored in organized directory structure
3. OCR processing extracts text content
4. AI service analyzes extracted text for key data points
5. System validates and categorizes the receipt
6. Data is stored in database with file references
7. User can review and edit extracted information

### Authentication Flow
1. User submits credentials via login form
2. Server validates credentials against database
3. Session is created and stored in memory
4. User role determines available features and permissions
5. Protected routes verify authentication status

## External Dependencies

### AI/ML Services
- **OpenAI API**: GPT-4 Vision for intelligent receipt analysis
- **Tesseract.js**: Client-side OCR processing

### UI/UX Libraries
- **Radix UI**: Accessible component primitives
- **shadcn/ui**: Pre-built component library
- **Lucide React**: Icon library
- **Recharts**: Chart and visualization components

### Development Tools
- **Drizzle Kit**: Database schema management and migrations
- **TypeScript**: Type safety across the entire stack
- **Vite**: Fast development server and build tool

## Deployment Strategy

### Build Process
- Frontend: Vite builds optimized React application
- Backend: ESBuild compiles TypeScript server code
- Database: Drizzle migrations ensure schema consistency

### Environment Configuration
- PostgreSQL database connection via DATABASE_URL
- OpenAI API key for AI processing
- Session secret for authentication security

### File Storage
- Local file system with organized directory structure
- Separate folders for receipts, documents, and temporary files
- Automatic directory creation and management

## Changelog
- June 27, 2025. Initial setup

## User Preferences
Preferred communication style: Simple, everyday language.