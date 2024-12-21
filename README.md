<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trading Community Course</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            line-height: 1.6;
        }
        header {
            background: #f4f4f4;
            padding: 1rem 0;
            text-align: center;
        }
        nav {
            display: flex;
            justify-content: center;
            gap: 1rem;
            background: #ddd;
            padding: 0.5rem 0;
        }
        nav a {
            text-decoration: none;
            color: #333;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem;
        }
        .hero {
            text-align: center;
            padding: 2rem 0;
            background: #eaeaea;
        }
        .hero h1 {
            margin: 0;
        }
        .section {
            padding: 2rem 0;
        }
        .course-details, .testimonials {
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
        }
        .card {
            flex: 1;
            background: #fff;
            border: 1px solid #ddd;
            border-radius: 5px;
            padding: 1rem;
        }
        footer {
            text-align: center;
            padding: 1rem;
            background: #f4f4f4;
            margin-top: 2rem;
        }
        .btn {
            display: inline-block;
            padding: 0.5rem 1rem;
            background: #333;
            color: #fff;
            text-decoration: none;
            border-radius: 5px;
            margin-top: 1rem;
        }
        .btn:hover {
            background: #555;
        }
    </style>
</head>
<body>
    <header>
        <h1>Welcome to Our Trading Community</h1>
        <p>Master trading patterns and strategies with our $10 course</p>
    </header>
    <nav>
        <a href="#home">Home</a>
        <a href="#about">About</a>
        <a href="#course">Course Details</a>
        <a href="#testimonials">Testimonials</a>
        <a href="#contact">Contact</a>
    </nav>
    
    <div class="container">
        <section id="home" class="hero">
            <h1>Transform Your Trading Today</h1>
            <p>Join a thriving community of traders and learn actionable strategies that work.</p>
            <a href="#course" class="btn">Learn More</a>
        </section>

        <section id="about" class="section">
            <h2>About Us</h2>
            <p>We are a community of passionate traders dedicated to mastering the stock market. Our $10 course offers everything you need to start your trading journey with confidence.</p>
        </section>

        <section id="course" class="section">
            <h2>Course Details</h2>
            <div class="course-details">
                <div class="card">
                    <h3>What You'll Learn</h3>
                    <ul>
                        <li>Identifying profitable patterns</li>
                        <li>Risk management strategies</li>
                        <li>Portfolio building tips</li>
                    </ul>
                </div>
                <div class="card">
                    <h3>Member Portfolios</h3>
                    <p>See what our members have achieved:</p>
                    <div style="height: 150px; background: #f4f4f4; text-align: center; line-height: 150px;">Add your own portfolio images here</div>
                </div>
            </div>
            <a href="#contact" class="btn">Get the Course Now</a>
        </section>

        <section id="testimonials" class="section">
            <h2>What Our Members Say</h2>
            <div class="testimonials">
                <div class="card">
                    <p>"This course changed my trading game! Highly recommend to beginners." - Alex J.</p>
                </div>
                <div class="card">
                    <p>"The strategies are simple yet powerful. Worth every penny!" - Jamie T.</p>
                </div>
            </div>
        </section>

        <section id="contact" class="section">
            <h2>Contact Us</h2>
            <p>Have questions or ready to join? Reach out to us!</p>
            <p>Email: support@tradingcommunity.com</p>
            <p>Follow us: 
                <a href="#">TikTok</a> | 
                <a href="#">Instagram</a>
            </p>
        </section>
    </div>

    <footer>
        <p>&copy; 2024 Trading Community. All rights reserved.</p>
    </footer>
</body>
</html>
