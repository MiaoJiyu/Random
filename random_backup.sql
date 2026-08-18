-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: random
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.24.04.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `configs`
--

DROP TABLE IF EXISTS `configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `configs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL DEFAULT '默认配置',
  `data` json NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configs`
--

LOCK TABLES `configs` WRITE;
/*!40000 ALTER TABLE `configs` DISABLE KEYS */;
INSERT INTO `configs` VALUES (4,'班级','{\"mode\": \"wheel\", \"items\": [{\"number\": 1, \"weight\": 100}, {\"number\": 2, \"weight\": 100}, {\"number\": 3, \"weight\": 100}, {\"number\": 4, \"weight\": 100}, {\"number\": 5, \"weight\": 100}, {\"number\": 6, \"weight\": 100}, {\"number\": 7, \"weight\": 100}]}',1,'2026-08-18 16:28:15','2026-08-18 19:25:52'),(5,'学号','{\"mode\": \"wheel\", \"items\": [{\"number\": 1, \"weight\": 100}, {\"number\": 2, \"weight\": 100}, {\"number\": 3, \"weight\": 100}, {\"number\": 4, \"weight\": 100}, {\"number\": 5, \"weight\": 100}, {\"number\": 6, \"weight\": 100}, {\"number\": 7, \"weight\": 100}, {\"number\": 8, \"weight\": 100}, {\"number\": 9, \"weight\": 100}, {\"number\": 10, \"weight\": 100}, {\"number\": 11, \"weight\": 100}, {\"number\": 12, \"weight\": 100}, {\"number\": 13, \"weight\": 100}, {\"number\": 14, \"weight\": 100}, {\"number\": 15, \"weight\": 100}, {\"number\": 16, \"weight\": 100}, {\"number\": 17, \"weight\": 100}, {\"number\": 18, \"weight\": 100}, {\"number\": 19, \"weight\": 100}, {\"number\": 20, \"weight\": 100}, {\"number\": 21, \"weight\": 100}, {\"number\": 22, \"weight\": 100}, {\"number\": 23, \"weight\": 100}, {\"number\": 24, \"weight\": 100}, {\"number\": 25, \"weight\": 100}, {\"number\": 26, \"weight\": 100}, {\"number\": 27, \"weight\": 100}, {\"number\": 28, \"weight\": 100}, {\"number\": 29, \"weight\": 100}, {\"number\": 30, \"weight\": 100}, {\"number\": 31, \"weight\": 100}, {\"number\": 32, \"weight\": 100}, {\"number\": 33, \"weight\": 100}, {\"number\": 34, \"weight\": 100}, {\"number\": 35, \"weight\": 100}, {\"number\": 36, \"weight\": 100}, {\"number\": 37, \"weight\": 100}, {\"number\": 38, \"weight\": 100}, {\"number\": 39, \"weight\": 100}, {\"number\": 40, \"weight\": 100}, {\"number\": 41, \"weight\": 100}, {\"number\": 42, \"weight\": 100}, {\"number\": 43, \"weight\": 100}, {\"number\": 44, \"weight\": 100}, {\"number\": 45, \"weight\": 100}, {\"number\": 46, \"weight\": 100}, {\"number\": 47, \"weight\": 100}, {\"number\": 48, \"weight\": 100}]}',0,'2026-08-18 16:30:21','2026-08-18 19:25:52');
/*!40000 ALTER TABLE `configs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `history`
--

DROP TABLE IF EXISTS `history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `number` int NOT NULL,
  `weight` int NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_number` (`number`)
) ENGINE=InnoDB AUTO_INCREMENT=79 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `history`
--

LOCK TABLES `history` WRITE;
/*!40000 ALTER TABLE `history` DISABLE KEYS */;
/*!40000 ALTER TABLE `history` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-18 19:31:13
