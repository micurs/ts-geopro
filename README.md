# Geometric Programming

This repository contains the implementation of various geometric entities using TypeScript.

## Table of Contents
- [Introduction](#introduction)
- [Entities Implemented](#entities-implemented)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Contributing](#contributing)

## Introduction

Geometric programming is a method of representing and manipulating geometric objects using algebraic expressions. This project aims to provide a set of basic geometric entities such as vectors, points, transformations, and reference frames.

## Entities Implemented

- **Vector**: Represents a mathematical vector with x, y, and z components.
- **Point**: Represents a point in 3D space.
- **Transformation**: Represents various transformations like rotation, scaling, and translation.
- **Reference Frame**: Provides a coordinate system for defining the position of geometric entities.

## Getting Started

To start using this project, you need to have Node.js and npm installed on your machine. You can then clone this repository and install the dependencies using the following commands:

```bash
git clone https://github.com/yourusername/ts-geopro.git
cd ts-geopro
npm install
```

## Usage

You can use the implemented entities in your TypeScript projects by importing them from their respective files. For example, to create a new vector and perform transformations on it, you can do the following:

```typescript
import { Vector } from './src/vector';
import { Rotation } from './src/rotation';

const v = new Vector(1, 2, 3);
console.log(v);

// Apply rotation transformation
const r = new Rotation(45, 'x');
v.transform(r);
console.log(v);
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have any suggestions or improvements.
