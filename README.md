# 前言

## Vite

[目前看到](https://www.bilibili.com/video/BV1GN4y1M7P5?p=2&vd_source=2f73c9264b81c60fa4eca969f99c0f9c)

- 构建工具
  1.
- webpack VS vite
  - webpack => 兼容性
    - 读取完毕所有依赖后再启动开发服务器
  - vite => 浏览器端的开发体验
    - 直接启动开发服务器，再按需加载依赖
- `yarn create vite`

  1. 全局安装 create-vite (vite 的脚手架)
     - create-vite 内置了 vite
  2. 运行 create-vite bin 目录下的一个执行配置

- 默认情况下，es module 导入资源，默认使用相对路径和绝对路径
  - 读取文件
    - 浏览器：发送网络请求 => 速度慢
    - node：读取本地文件 => 速度快
  - => 默认情况下，es module 不会考虑 node_modules 下的文件
