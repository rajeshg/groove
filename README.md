# Groove

Groove is a refined, high-performance Kanban board application built with React Router v7. It combines the sophisticated aesthetics of [fizzy.do](https://fizzy.do) with the core Kanban principles established in Ryan Florence's Trellix work.

## ✨ Features

- **Intuitive Board Management**: Create, customize, and organize multiple boards with distinct color identities.
- **Sophisticated Column Interactions**:
  - **Expand/Collapse**: Focus on what matters by collapsing columns into minimalist "guitar strings".
  - **Guitar Strings**: Collapsed columns feature vertical progress indicators inspired by Fizzy's unique design language.
  - **Dynamic Reordering**: Fluid drag-and-drop for both columns and cards.
- **Advanced Card System**:
  - **Rich Content**: Full card detail view with support for descriptions and metadata.
  - **Assignments**: Assign team members to cards for clear ownership.
  - **Comments**: Track discussions directly on cards.
- **Mobile-Responsive by Design**:
  - **Horizontal Guitar Cards**: A specialized mobile view that converts vertical columns into horizontal progress cards.
  - **Proportional Gradients**: Mobile cards show proportional gradient fills based on card count.
  - **Optimized Navigation**: Dedicated column detail views for small screens.
- **Productivity First**:
  - **Keyboard Shortcuts**: Quickly add cards with the 'c' shortcut and navigate with ease.
  - **Template System**: Jumpstart projects with pre-defined board templates.
  - **Optimistic UI**: Instant updates for a zero-latency feel using React Router's fetchers.

## 🛠️ Tech Stack

- **Framework**: [React Router v7](https://reactrouter.com/) (Vite-based)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Database**: [Prisma](https://www.prisma.io/) with SQLite
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: React Router Loaders, Actions, and Fetchers
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Linting/Formatting**: [oxlint](https://oxlint.dev/) and [oxfmt](https://github.com/oxc-project/oxfmt)

## 🚀 Getting Started

### Prerequisites

- Node.js (Latest LTS recommended)
- npm or pnpm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/groove.git
   cd groove
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up the database:
   ```bash
   npx prisma migrate dev
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## 📜 Development Commands

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run typecheck`: Run TypeScript compiler check
- `npm run lint`: Run oxlint for fast code analysis
- `npm run format`: Format code using oxfmt
- `npm test`: Run vitest suite

## 🎨 Design Philosophy

Groove aims for a "Goldilocks" balance between a simple list and a complex project management tool. It uses verticality and color-mixed gradients to provide subconscious cues about project health and progress.

## ❤️ Credits

Inspired by:
- **Fizzy** ([fizzy.do](https://fizzy.do)): For the unique "guitar string" aesthetic and proportional progress design.
- **Ryan Florence's Trellix**: For the foundational Kanban logic and React Router patterns.

---

Built with precision and rhythm.
