# README

## 零、工具准备

> 使用 vitest 进行单元测试

1. `npm init -y` 初始化项目
2. `npm install vite -D` 不一定有用，反正我先安装了
3. `npm install vitest -D` 测试工具安装

   - 根目录下创建 `vites.config.ts` 文件

     ```ts
     /// <reference types="vitest" />
     import { defineConfig } from 'vitest/config';

     export default defineConfig({
       test: {
         globals: true // 用于全局识别 vitest 的测试函数 test, describe 等
       }
     });
     ```

4. `npm install typescript` 使用 ts 编写
   - `tsc --init` 初始化自动创建 `tsconfig.json` 文件
   - 修改配置
     ```json
     {
       "lib": ["ESNext", "DOM"],
       "types": ["vitest/globals"]
     }
     ```

## 一、响应系统

> Vue.js 分为三大模块——响应系统、渲染器、编译器。本系列按顺序学习。（不保证后续内容完整，随时中断）

凡从想法落到实地，粗浅分为三个阶段：想法 -> 方案 -> 可用的工具，逐步完善。对于响应系统的讲解，也将分为这三个阶段。

[想法](./src/reactivity/md/01-thought.md)：一言以蔽之，读取时收集依赖，设置时触发依赖。
