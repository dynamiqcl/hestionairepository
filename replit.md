# Hestion AI - Intelligent Receipt Management Platform

## Overview

Hestion AI is a comprehensive financial management platform designed specifically for the Chilean market. The system leverages artificial intelligence to digitize and organize receipts, enabling businesses and independent professionals to streamline their financial document management. The platform supports both PDF uploads and image processing through advanced OCR technology.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent UI design
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **API Design**: RESTful API with structured error handling

### Database & ORM
- **Database**: PostgreSQL with connection pooling
- **ORM**: Drizzle ORM with Neon serverless driver
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: WebSocket support for real-time features

## Key Components

### Authentication System
- Role-based access control (CLIENTE, ADMINISTRADOR, EMPLEADO)
- Session-based authentication with memory store
- Password hashing using Node.js crypto scrypt
- Protected routes with middleware validation

### Receipt Processing Pipeline
1. **File Upload**: Support for JPG, PNG, and PDF files via multer
2. **OCR Processing**: Tesseract.js for text extraction from images
3. **AI Analysis**: OpenAI GPT-4 Vision for intelligent data extraction
4. **Data Validation**: Multi-layer validation with confidence scoring
5. **Category Classification**: Automatic categorization using AI models

### Document Management
- Secure file storage with organized directory structure
- Role-based document access control
- PDF and image processing capabilities
- Document versioning and metadata tracking

### User Interface Components
- Responsive design with mobile camera integration
- Progressive file upload with preview
- Real-time processing status updates
- Administrative dashboards for system management

## Data Flow

### Receipt Upload Process
1. User uploads receipt (image/PDF) through web interface
2. File is stored in organized directory structure
3. OCR engine extracts text content
4. AI service analyzes extracted data for key information
5. System validates and categorizes the receipt
6. User can review and edit extracted data
7. Final data is stored in PostgreSQL database

### Authentication Flow
1. User submits credentials via login form
2. Passport.js validates against database
3. Session is established with role information
4. Protected routes verify authentication status
5. Role-based permissions control feature access

### Document Access Flow
1. User requests document through secure endpoint
2. System validates user permissions
3. File is served with appropriate security headers
4. Access is logged for audit purposes

## External Dependencies

### AI Services
- **OpenAI GPT-4 Vision**: Advanced receipt analysis and data extraction
- **Tesseract.js**: Client-side OCR processing for images

### File Processing
- **Multer**: File upload handling with disk storage
- **Sharp** (implied): Image processing and optimization

### UI Libraries
- **Radix UI**: Accessible component primitives
- **Lucide React**: Consistent icon set
- **Recharts**: Data visualization for financial analytics

### Development Tools
- **ESBuild**: Fast JavaScript bundling for production
- **TSX**: TypeScript execution for development
- **PostCSS**: CSS processing with autoprefixer

## Deployment Strategy

### Development Environment
- Hot module replacement via Vite
- TypeScript compilation checking
- Real-time error overlay for debugging
- Memory-based session storage

### Production Build
- Vite builds optimized frontend bundle
- ESBuild creates server bundle for Node.js
- Static assets served from dist/public
- Database migrations applied via Drizzle Kit

### Environment Configuration
- Database connection via DATABASE_URL
- OpenAI API key for AI services
- Session secrets for authentication
- File upload directory configuration

### Deployment Considerations
- Node.js production server setup
- PostgreSQL database provisioning
- Static file serving configuration
- Environment variable management
- SSL/TLS certificate configuration

## Changelog
- June 27, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.