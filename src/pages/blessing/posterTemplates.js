/**
 * Blessing Poster Templates Configuration
 * 负责管理不同目标对象的海报视觉风格
 */

export const PosterTemplates = {
    // 1. Neo-Chinese (新中式高阶)
    'neo-chinese': {
        name: '新中式',
        cssClass: 'theme-neo',
        canvasConfig: {
            bgGradient: ['#330000', '#990000'], // Deep Red to Crimson (More Traditional)
            titleGradient: '#FFD700', // Solid Gold
            textColor: '#FFF0C4', // Soft Creamy Gold
            coupletColor: '#FFD700', // Bright Gold
            watermarkColor: 'rgba(255, 255, 255, 0.05)',
            stampColor: '#d4af37'
        },
        defaultTitle: '马到成功',
        couplets: ['贰零贰陆 · 丙午马年', '龙马精神 · 阖家大吉']
    },
    
    // 2. Classic Red (经典正红) - 通用默认
    'classic': {
        name: '经典红',
        cssClass: 'theme-classic',
        canvasConfig: {
            bgGradient: ['#D32F2F', '#B71C1C'],
            titleGradient: '#FFFF00', // Solid Yellow
            textColor: '#FFFFFF',
            coupletColor: 'rgba(255, 215, 0, 0.6)',
            watermarkColor: 'rgba(255, 255, 255, 0.03)',
            stampColor: '#FFD700'
        },
        defaultTitle: '万事顺意',
        couplets: ['恭贺新春 · 吉祥如意', '瑞马迎春 ·岁岁平安']
    },
    
    // 3. Dopamine (多巴胺潮酷)
    'dopamine': {
        name: '多巴胺',
        cssClass: 'theme-dopamine',
        canvasConfig: {
            bgGradient: ['#E056FD', '#FFF200', '#FF00CC'], // Mesh-like (we mimic with simple gradient or 3 colors)
            titleGradient: '#FFFFFF',
            textColor: '#00008B', // Dark Blue for contrast
            coupletColor: '#fea3f8', // 改为深蓝色，与背景高对比度
            watermarkColor: 'rgba(255, 255, 255, 0.1)',
            stampColor: '#E056FD'
        },
        defaultTitle: '马里奥！',
        couplets: ['搞钱要紧 · 快乐万岁', '暴富暴美 · 全场最顶']
    },
    
    // 4. Cinematic (电影感极简)
    'cinematic': {
        name: '电影感',
        cssClass: 'theme-cinematic',
        canvasConfig: {
            bgGradient: ['#2b0f0f', '#1a0505'], // Deep Wine Red to Black
            titleGradient: '#FFFFFF',
            textColor: 'rgba(255, 255, 255, 0.95)',
            coupletColor: 'rgba(255, 255, 255, 0.4)',
            watermarkColor: 'rgba(255, 255, 255, 0.02)',
            stampColor: '#FFFFFF',
            orbs: [
                { color: '#ff6b6b', x: 0.2, y: 0.3, r: 200 }, // Warm Red Orb
                { color: '#4ecdc4', x: 0.8, y: 0.7, r: 150 }  // Cyan Orb
            ]
        },
        defaultTitle: '友谊长存',
        couplets: ['相识有缘 · 相知有幸', '岁月不老 · 友谊不散']
    },
    
    // 5. Business (黑金商务) - 适配商务场合/合作伙伴
    'business': {
        name: '黑金商务',
        cssClass: 'theme-business',
        canvasConfig: {
            bgGradient: ['#0a0a0a', '#1a1a1a'], // Deep Black
            titleGradient: '#ffcb21', // Solid Gold
            textColor: '#ffed85',
            coupletColor: 'rgba(212, 175, 55, 0.7)',
            watermarkColor: 'rgba(212, 175, 55, 0.05)',
            stampColor: '#d4af37'
        },
        defaultTitle: '鸿运当头',
        couplets: ['生意兴隆 · 财源广进', '合作共赢 · 前程似锦']
    },
    
    // 6. Sweet (甜蜜恋人) - 适配恋人/对象
    'sweet': {
        name: '甜蜜恋人',
        cssClass: 'theme-sweet',
        canvasConfig: {
            bgGradient: ['#ffc4e1', '#ffd9ec', '#fff0f7'], // 调淡背景，更柔和
            titleGradient: '#FF69B4', // Hot Pink
            textColor: '#d81b60', // 深粉红，高对比度
            coupletColor: 'rgba(216, 27, 96, 0.7)',
            watermarkColor: 'rgba(255, 105, 180, 0.08)',
            stampColor: '#ff1493',
            // 小清新装饰元素
            decorations: {
                hearts: [
                    { x: 0.1, y: 0.15, size: 30, color: '#ff69b4', opacity: 0.6 },
                    { x: 0.9, y: 0.2, size: 25, color: '#ff1493', opacity: 0.5 },
                    { x: 0.15, y: 0.8, size: 20, color: '#ffb6d9', opacity: 0.7 },
                    { x: 0.85, y: 0.75, size: 28, color: '#ff69b4', opacity: 0.6 }
                ],
                flowers: [
                    { x: 0.05, y: 0.4, size: 35, color: '#ffc0e3', opacity: 0.5 },
                    { x: 0.95, y: 0.5, size: 30, color: '#ffb6d9', opacity: 0.6 }
                ],
                balloons: [
                    { x: 0.2, y: 0.25, size: 45, color: '#ffb6d9', opacity: 0.4 },  // 淡粉色
                    { x: 0.75, y: 0.4, size: 34, color: '#b3e5fc', opacity: 0.35 }, // 淡蓝色
                    { x: 0.12, y: 0.65, size: 28, color: '#fff9c4', opacity: 0.4 }, // 淡黄色
                    { x: 0.88, y: 0.85, size: 35, color: '#e1bee7', opacity: 0.38 } // 淡紫色
                ]
            }
        },
        defaultTitle: '甜蜜时光',
        couplets: ['春风十里 · 不如你', '岁岁年年 · 有你真好']
    }
}

/**
 * 根据发送对象（Target ID）获取对应的模板配置
 */
export const getTemplateByTarget = (targetId) => {
    // 映射逻辑
    const mapping = {
        'boss': 'business', // 领导/甲方
        'relatives': 'classic', // 七大姑八大姨
        'ex': 'neo-chinese', // 同学/前任
        'bestie': 'dopamine', // 死党/闺蜜
        'crush': 'sweet', // 恋人/对象 - 使用甜蜜恋人风
        'fri': 'cinematic'  // 朋友/同事 - 使用电影感主题
    }
    
    const templateId = mapping[targetId] || 'classic'
    return {
        id: templateId,
        ...PosterTemplates[templateId]
    }
}
