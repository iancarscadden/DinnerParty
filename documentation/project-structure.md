# Project Structure

## Directory Organization

```
DinnerParty/
├── app/                      # Main application routes
│   ├── (tabs)/              # Tab-based navigation
│   │   ├── map.tsx          # Map screen
│   │   ├── social.tsx       # Social screen
│   │   └── profile.tsx      # Profile screen
│   └── onboarding/          # Onboarding flow
│       └── welcome.tsx      # Welcome screen
├── components/              # Reusable components
│   ├── auth/               # Authentication components
│   ├── group/              # Group-related components
│   └── ui/                 # UI components
├── contexts/               # React contexts
│   ├── AuthContext.tsx     # Authentication context
│   └── GroupContext.tsx    # Group management context
├── services/               # Business logic and API calls
│   ├── auth.ts            # Authentication service
│   ├── groups.ts          # Group management service
│   ├── users.ts           # User management service
│   └── supabase.ts        # Supabase configuration
├── screens/                # Screen components
│   ├── group/             # Group-related screens
│   │   ├── GroupSetupScreen.tsx
│   │   ├── GroupWaitingScreen.tsx
│   │   ├── GroupProfileScreen.tsx
│   │   └── InitialGroupScreen.tsx
│   └── group-screen.tsx   # Main group screen
├── styles/                # Global styles
│   └── theme.ts          # Theme configuration
├── types/                 # TypeScript type definitions
├── utils/                 # Utility functions
├── assets/               # Static assets
│   ├── images/          # Image assets
│   └── videos/          # Video assets
└── documentation/        # Project documentation
    ├── database-tables.txt    # Database schema
    ├── database-functions.txt # Database functions
    ├── progress.md           # Development progress
    └── project-structure.md  # This file

```

## Key Components

### Screens
- **GroupScreen**: Main container for group functionality
- **GroupSetupScreen**: Group profile creation and video upload
- **GroupWaitingScreen**: Waiting room for group formation
- **GroupProfileScreen**: Display group profile and videos
- **InitialGroupScreen**: Initial group creation/joining

### Services
- **auth.ts**: Authentication and session management
- **groups.ts**: Group CRUD operations and state management
- **users.ts**: User profile management
- **supabase.ts**: Database configuration and types

### Contexts
- **AuthContext**: User authentication state
- **GroupContext**: Group management state

### Components
- **GroupCard**: Display group information in card format
- **VideoUpload**: Handle video upload and processing
- **MemberList**: Display group members
- **LoadingSpinner**: Loading state indicator

## State Management

### Authentication State
- Managed through AuthContext
- Handles user session and profile
- Provides login/logout functionality

### Group State
- Managed through GroupContext
- Tracks current group membership
- Handles group updates and notifications

## Database Integration

### Tables
- users: User profiles
- groups: Group information
- group_members: Group membership

### Real-time Updates
- Supabase subscriptions for group changes
- Real-time member updates
- State synchronization

## Navigation Flow

1. Authentication
   - Welcome screen
   - Login/Register
   - Profile creation

2. Group Management
   - Create/Join group
   - Waiting room
   - Group setup
   - Group profile

3. Social Features
   - Browse groups
   - Dinner party management
   - Chat functionality

## Style Guidelines

- Use functional components with hooks
- Follow TypeScript best practices
- Implement proper error handling
- Use consistent naming conventions
- Document complex functions
- Write clean, maintainable code