# 前言

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
